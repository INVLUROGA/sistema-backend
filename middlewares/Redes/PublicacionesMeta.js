const { default: axios } = require("axios");
require("dotenv").config();
const env = process.env;

const GRAPH = "https://graph.facebook.com/v24.0";
// Página de Facebook "CHANGE - The Slim Studio" y su Instagram vinculado @change.com.pe
const ID_PAGINA_FACEBOOK = "392407903947837";
const ID_INSTAGRAM = "17841467445574545";

// Meta devuelve fechas como "2026-11-05T13:36:03+0000"
const aFecha = (texto) =>
  new Date(texto.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));

// Recorre las paginas de un listado de Meta hasta juntar "cantidad" filas
const listar = async (url, params, cantidad) => {
  const filas = [];
  let siguiente = url;
  let parametros = { ...params, limit: Math.min(cantidad, 100) };
  while (siguiente && filas.length < cantidad) {
    const { data } = await axios.get(siguiente, { params: parametros });
    filas.push(...data.data);
    // la url de "next" ya trae todos los parametros
    siguiente = data.paging?.next;
    parametros = undefined;
  }
  return filas.slice(0, cantidad);
};

// Metricas (insights) de una publicacion como { metrica: valor }.
// Si Meta no da alguna para ese tipo de publicacion, esa queda en 0.
const insights = async (id, metricas, token) => {
  const resultado = Object.fromEntries(metricas.map((m) => [m, 0]));
  try {
    const { data } = await axios.get(`${GRAPH}/${id}/insights`, {
      params: { metric: metricas.join(","), access_token: token },
    });
    for (const m of data.data ?? []) {
      resultado[m.name] = Number(
        m.values?.[0]?.value ?? m.total_value?.value ?? 0,
      );
    }
  } catch (error) {
    // se deja en 0
  }
  return resultado;
};

// Ultimas publicaciones de Instagram. Compartidos y visualizaciones solo vienen por insights
// (una consulta por publicacion); si Meta no los da para ese tipo, quedan en 0.
const publicacionesInstagram = async (cantidad = 50) => {
  const medias = await listar(
    `${GRAPH}/${ID_INSTAGRAM}/media`,
    {
      fields:
        "id,timestamp,media_type,media_product_type,caption,like_count,comments_count",
      access_token: env.TOKEN_META,
    },
    cantidad,
  );
  const publicaciones = [];
  for (const m of medias) {
    const { shares, views } = await insights(
      m.id,
      ["shares", "views"],
      env.TOKEN_META,
    );
    publicaciones.push({
      red: "INSTAGRAM",
      id_publicacion: m.id,
      fecha: aFecha(m.timestamp),
      tipo: m.media_product_type === "REELS" ? "REEL" : m.media_type,
      publicacion: m.caption ?? "",
      n_likes: Number(m.like_count ?? 0),
      n_comentarios: Number(m.comments_count ?? 0),
      n_compartidos: shares,
      n_visualizaciones: views,
    });
  }
  return publicaciones;
};

// Ultimas publicaciones de Facebook. Se leen con el token de la pagina.
// n_likes = total de reacciones (like, me encanta, etc.)
// n_visualizaciones = insights "post_media_view" (una consulta por publicacion)
const publicacionesFacebook = async (cantidad = 50) => {
  const { data: pagina } = await axios.get(`${GRAPH}/${ID_PAGINA_FACEBOOK}`, {
    params: { fields: "access_token", access_token: env.TOKEN_META },
  });
  const posts = await listar(
    `${GRAPH}/${ID_PAGINA_FACEBOOK}/posts`,
    {
      fields:
        "id,created_time,message,status_type,attachments{media_type},shares,reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)",
      access_token: pagina.access_token,
    },
    cantidad,
  );
  const publicaciones = [];
  for (const p of posts) {
    const { post_media_view } = await insights(
      p.id,
      ["post_media_view"],
      pagina.access_token,
    );
    publicaciones.push({
      red: "FACEBOOK",
      id_publicacion: p.id,
      fecha: aFecha(p.created_time),
      tipo: (
        p.attachments?.data?.[0]?.media_type ??
        p.status_type ??
        ""
      ).toUpperCase(),
      publicacion: p.message ?? "",
      n_likes: Number(p.reactions?.summary?.total_count ?? 0),
      n_comentarios: Number(p.comments?.summary?.total_count ?? 0),
      n_compartidos: Number(p.shares?.count ?? 0),
      n_visualizaciones: post_media_view,
    });
  }
  return publicaciones;
};

module.exports = {
  publicacionesInstagram,
  publicacionesFacebook,
};
