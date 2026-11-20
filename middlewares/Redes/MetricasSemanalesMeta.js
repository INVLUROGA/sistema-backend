const { default: axios } = require("axios");
require("dotenv").config();
const { MetricasSemanalesRedes, sincronizado } = require("../../models/MetricasSemanalesRedes");
const env = process.env;

// Página de Facebook "CHANGE - The Slim Studio" (su Instagram vinculado es @change.com.pe)
const ID_PAGINA_FACEBOOK = "392407903947837";
const GRAPH = "https://graph.facebook.com/v24.0";
// id_red de tb_parametros (entidad_param "redes-sociales", grupo_param "seguidores")
const ID_RED_FACEBOOK = 2064;
const ID_RED_INSTAGRAM = 2065;
// Instagram solo guarda las altas y bajas de seguidores del ultimo año
const DIAS_HISTORIAL_INSTAGRAM = 364;
// Facebook acepta como maximo ~93 dias por consulta de insights
const DIAS_POR_CONSULTA_FACEBOOK = 90;

// Perú es UTC-5 todo el año; las fechas son YYYY-MM-DD en hora Perú
const DIA_MS = 24 * 60 * 60 * 1000;
const OFFSET_PERU_MS = 5 * 60 * 60 * 1000;
const diaPeru = (fecha) => new Date(new Date(fecha).getTime() - OFFSET_PERU_MS).toISOString().slice(0, 10);
const sumarDias = (dia, n) => new Date(Date.parse(`${dia}T00:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);
// Medianoche de Perú de ese dia, en segundos (since/until de Meta)
const unixPeru = (dia) => Math.floor((Date.parse(`${dia}T00:00:00Z`) + OFFSET_PERU_MS) / 1000);

// Meta a veces responde un error transitorio (is_transient): se reintenta hasta 3 veces
const graph = async (ruta, params, token = env.TOKEN_META, intento = 1) => {
  const url = ruta.startsWith("http") ? ruta : `${GRAPH}/${ruta}`;
  try {
    const { data } = await axios.get(url, { params: ruta.startsWith("http") ? {} : { access_token: token, ...params } });
    return data;
  } catch (error) {
    if (intento >= 3 || !error.response?.data?.error?.is_transient) throw error;
    await new Promise((resolve) => setTimeout(resolve, 3000 * intento));
    return graph(ruta, params, token, intento + 1);
  }
};
// Recorre todas las paginas de una lista de Meta
const graphTodo = async (ruta, params, token) => {
  const filas = [];
  let respuesta = await graph(ruta, { limit: 100, ...params }, token);
  filas.push(...respuesta.data);
  while (respuesta.paging?.next) {
    respuesta = await graph(respuesta.paging.next);
    filas.push(...respuesta.data);
  }
  return filas;
};

// Bloques de 7 dias desde el dia de inicio hasta hoy; el ultimo puede estar incompleto
const armarSemanas = (inicio, hoy) => {
  const semanas = [];
  for (let dia = inicio; dia <= hoy; dia = sumarDias(dia, 7)) {
    const fin = sumarDias(dia, 6);
    semanas.push({ semana_inicio: dia, semana_fin: fin < hoy ? fin : hoy });
  }
  return semanas;
};
// posts: [{dia, likes, comentarios}] -> cantidad de posts y sus likes y comentarios por semana de publicacion
const sumarPosts = (semana, posts) => {
  const delaSemana = posts.filter((p) => p.dia >= semana.semana_inicio && p.dia <= semana.semana_fin);
  return {
    posts: delaSemana.length,
    likes: delaSemana.reduce((total, p) => total + p.likes, 0),
    comentarios: delaSemana.reduce((total, p) => total + p.comentarios, 0),
  };
};

const metricasFacebook = async (hoy, seguidoresHoy) => {
  const { access_token: tokenPagina } = await graph(ID_PAGINA_FACEBOOK, { fields: "access_token" });
  const posts = (
    await graphTodo(
      `${ID_PAGINA_FACEBOOK}/posts`,
      { fields: "created_time,reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)" },
      tokenPagina,
    )
  ).map((p) => ({
    dia: diaPeru(p.created_time),
    likes: p.reactions?.summary?.total_count ?? 0,
    comentarios: p.comments?.summary?.total_count ?? 0,
  }));
  if (posts.length === 0) return [];
  const inicio = posts.reduce((min, p) => (p.dia < min ? p.dia : min), hoy);

  // Insights diarios: total de seguidores, altas y bajas. dia -> valor
  const porDia = { page_follows: new Map(), page_daily_follows_unique: new Map(), page_daily_unfollows_unique: new Map() };
  for (let desde = inicio; desde < hoy; desde = sumarDias(desde, DIAS_POR_CONSULTA_FACEBOOK)) {
    const hasta = sumarDias(desde, DIAS_POR_CONSULTA_FACEBOOK);
    const { data } = await graph(
      `${ID_PAGINA_FACEBOOK}/insights`,
      { metric: Object.keys(porDia).join(","), period: "day", since: unixPeru(desde), until: unixPeru(hasta < hoy ? hasta : hoy) },
      tokenPagina,
    );
    for (const metrica of data) {
      // end_time es el final del dia (medianoche del dia siguiente): el valor es del dia anterior
      for (const v of metrica.values) porDia[metrica.name]?.set(sumarDias(v.end_time.slice(0, 10), -1), v.value);
    }
  }
  const sumaSemana = (mapa, semana) => {
    let total = null;
    for (let dia = semana.semana_inicio; dia <= semana.semana_fin; dia = sumarDias(dia, 1)) {
      if (mapa.has(dia)) total = (total ?? 0) + mapa.get(dia);
    }
    return total;
  };
  // Seguidores al final de la semana: el ultimo dia con dato; la semana en curso usa el total de hoy
  const seguidoresAlFinal = (semana) => {
    if (semana.semana_fin === hoy && Number.isInteger(seguidoresHoy)) return seguidoresHoy;
    for (let dia = semana.semana_fin; dia >= semana.semana_inicio; dia = sumarDias(dia, -1)) {
      if (porDia.page_follows.has(dia)) return porDia.page_follows.get(dia);
    }
    return null;
  };
  return armarSemanas(inicio, hoy).map((semana) => ({
    id_red: ID_RED_FACEBOOK,
    ...semana,
    seguidores: seguidoresAlFinal(semana),
    seguidores_ganados: sumaSemana(porDia.page_daily_follows_unique, semana),
    seguidores_perdidos: sumaSemana(porDia.page_daily_unfollows_unique, semana),
    ...sumarPosts(semana, posts),
  }));
};

const metricasInstagram = async (hoy, idInstagram, seguidoresHoy) => {
  const posts = (await graphTodo(`${idInstagram}/media`, { fields: "timestamp,like_count,comments_count" })).map((m) => ({
    dia: diaPeru(m.timestamp),
    likes: m.like_count ?? 0,
    comentarios: m.comments_count ?? 0,
  }));
  if (posts.length === 0) return [];
  const inicio = posts.reduce((min, p) => (p.dia < min ? p.dia : min), hoy);
  const limiteHistorial = sumarDias(hoy, -DIAS_HISTORIAL_INSTAGRAM);

  const filas = [];
  for (const semana of armarSemanas(inicio, hoy)) {
    let seguidores_ganados = null;
    let seguidores_perdidos = null;
    // Altas (FOLLOWER) y bajas (NON_FOLLOWER) de la semana; antes del ultimo año Meta no tiene el dato
    if (semana.semana_inicio >= limiteHistorial && semana.semana_inicio < hoy) {
      try {
        const { data } = await graph(`${idInstagram}/insights`, {
          metric: "follows_and_unfollows",
          period: "day",
          metric_type: "total_value",
          breakdown: "follow_type",
          since: unixPeru(semana.semana_inicio),
          until: unixPeru(sumarDias(semana.semana_fin, 1)),
        });
        const resultados = data[0]?.total_value?.breakdowns?.[0]?.results ?? [];
        const valor = (tipo) => resultados.find((r) => r.dimension_values?.[0] === tipo)?.value ?? 0;
        seguidores_ganados = valor("FOLLOWER");
        seguidores_perdidos = valor("NON_FOLLOWER");
      } catch (error) {
        console.log(
          `MetricasSemanalesMeta: Instagram sin altas/bajas para la semana ${semana.semana_inicio}`,
          error.response?.data?.error?.message ?? error.message,
        );
      }
    }
    filas.push({ id_red: ID_RED_INSTAGRAM, ...semana, seguidores: null, seguidores_ganados, seguidores_perdidos, ...sumarPosts(semana, posts) });
  }
  // Instagram no da el total de seguidores por dia: se reconstruye hacia atras desde el total de hoy
  // restando lo que se gano (altas - bajas) en cada semana posterior. Se corta en la primera semana sin dato
  let seguidores = Number.isInteger(seguidoresHoy) ? seguidoresHoy : null;
  for (let i = filas.length - 1; i >= 0 && seguidores !== null; i--) {
    filas[i].seguidores = seguidores;
    const { seguidores_ganados, seguidores_perdidos } = filas[i];
    seguidores = seguidores_ganados === null ? null : seguidores - (seguidores_ganados - seguidores_perdidos);
  }
  return filas;
};

// Calcula las semanas de Facebook e Instagram desde su primer post (no guarda nada)
const calcularMetricasSemanalesMeta = async () => {
  const hoy = diaPeru(Date.now());
  const cuenta = await graph(ID_PAGINA_FACEBOOK, {
    fields: "followers_count,instagram_business_account{id,followers_count}",
  });
  const ig = cuenta.instagram_business_account;
  const facebook = await metricasFacebook(hoy, cuenta.followers_count);
  const instagram = ig ? await metricasInstagram(hoy, ig.id, ig.followers_count) : [];
  return [...facebook, ...instagram];
};

// Guarda en tb_metricas_semanales_redes una fila por red y semana (si ya existe se actualiza).
// Los likes y comentarios se recalculan siempre; los seguidores solo se pisan si Meta devolvio el dato,
// asi las semanas que salen del ultimo año de Instagram conservan lo que ya se guardo.
const registrarMetricasSemanalesMeta = async () => {
  let filas;
  try {
    filas = await calcularMetricasSemanalesMeta();
  } catch (error) {
    console.log(
      "registrarMetricasSemanalesMeta: no se pudo consultar Meta",
      error.response?.data?.error?.message ?? error.message,
    );
    return;
  }
  await sincronizado;
  let guardadas = 0;
  for (const fila of filas) {
    try {
      const existente = await MetricasSemanalesRedes.findOne({
        where: { id_red: fila.id_red, semana_inicio: fila.semana_inicio, flag: true },
      });
      if (!existente) {
        await MetricasSemanalesRedes.create({ ...fila, flag: true });
      } else {
        const cambios = { ...fila };
        for (const campo of ["seguidores", "seguidores_ganados", "seguidores_perdidos"]) {
          if (cambios[campo] === null) delete cambios[campo];
        }
        await existente.update(cambios);
      }
      guardadas++;
    } catch (error) {
      console.log(
        `registrarMetricasSemanalesMeta: error al guardar id_red ${fila.id_red} semana ${fila.semana_inicio}`,
        error.message,
      );
    }
  }
  console.log(`registrarMetricasSemanalesMeta: ${guardadas} de ${filas.length} semanas guardadas`);
};

module.exports = {
  calcularMetricasSemanalesMeta,
  registrarMetricasSemanalesMeta,
};
