const { request, response } = require("express");
const { leadsxDia } = require("../models/Venta");
const {
  campaniasMetaPorCampania,
} = require("../middlewares/Redes/CampaniasMeta");
const { db } = require("../database/sequelizeConnection");

// Prospectos por red y por dia (tb_leadsDia: id_red, fecha, cantidad, monto).
// Las filas de Meta las registra cada dia el cron registrarAdsDiario.
const getProspectosRedes = async (req = request, res = response) => {
  try {
    const prospectosRedes = await leadsxDia.findAll({
      attributes: ["id", "id_red", "fecha", "cantidad", "monto"],
      where: { flag: true },
      order: [["fecha", "desc"]],
    });
    res.status(200).json({
      prospectosRedes,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema",
      error: error.message,
    });
  }
};

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
// Resultados de Meta Ads por campaña. Montos en USD sin IGV.
// ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
const getCampaniasMeta = async (req = request, res = response) => {
  const { desde, hasta } = req.query;
  if (!FORMATO_FECHA.test(desde ?? "") || !FORMATO_FECHA.test(hasta ?? "")) {
    return res.status(400).json({
      ok: false,
      msg: "Envia desde y hasta con formato YYYY-MM-DD",
    });
  }
  if (desde > hasta) {
    return res.status(400).json({
      ok: false,
      msg: "La fecha desde no puede ser mayor que hasta",
    });
  }
  try {
    const campanias = await campaniasMetaPorCampania(desde, hasta);
    const importeGastado = campanias.reduce((t, c) => t + c.importeGastado, 0);
    const conversaciones = campanias.reduce((t, c) => t + c.conversaciones, 0);
    res.status(200).json({
      desde,
      hasta,
      moneda: "USD",
      totales: {
        importeGastado: Number(importeGastado.toFixed(2)),
        conversaciones,
        costoxConversacion: conversaciones
          ? Number((importeGastado / conversaciones).toFixed(2))
          : 0,
      },
      campanias,
    });
  } catch (error) {
    res.status(502).json({
      ok: false,
      msg: "No se pudo consultar Meta Ads",
      error: error.response?.data?.error?.message ?? error.message,
    });
  }
};

// Seguidores por red y por dia (tb_seguidores_redes, lo llena el cron registrarSeguidoresDiario).
// ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// La fecha sale como texto YYYY-MM-DD: leida como Date el driver la corre un dia segun la TZ del servidor.
const getSeguidoresRedes = async (req = request, res = response) => {
  const { desde, hasta } = req.query;
  if (!FORMATO_FECHA.test(desde ?? "") || !FORMATO_FECHA.test(hasta ?? "")) {
    return res.status(400).json({
      ok: false,
      msg: "Envia desde y hasta con formato YYYY-MM-DD",
    });
  }
  if (desde > hasta) {
    return res.status(400).json({
      ok: false,
      msg: "La fecha desde no puede ser mayor que hasta",
    });
  }
  try {
    const [seguidoresRedes] = await db.query(
      `SELECT s.id, s.id_red, p.label_param AS red, s.seguidores, s.likes, s.comentarios,
              CONVERT(varchar(10), s.fecha, 23) AS fecha
       FROM tb_seguidores_redes s
       LEFT JOIN tb_parametros p ON p.id_param = s.id_red
       WHERE s.flag = 1 AND s.fecha BETWEEN :desde AND :hasta
       ORDER BY s.fecha DESC, s.id_red`,
      { replacements: { desde, hasta } },
    );
    res.status(200).json({
      desde,
      hasta,
      seguidoresRedes,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema",
      error: error.message,
    });
  }
};

// Seguidores, likes y comentarios por red en bloques de 7 dias (tb_metricas_semanales_redes,
// lo llena el cron registrarMetricasSemanalesMeta). ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD: semanas que se cruzan con el rango.
// seguidores / seguidores_ganados / seguidores_perdidos pueden venir null (Instagram solo tiene el ultimo año).
const getMetricasSemanalesRedes = async (req = request, res = response) => {
  const { desde, hasta } = req.query;
  if (!FORMATO_FECHA.test(desde ?? "") || !FORMATO_FECHA.test(hasta ?? "")) {
    return res.status(400).json({
      ok: false,
      msg: "Envia desde y hasta con formato YYYY-MM-DD",
    });
  }
  if (desde > hasta) {
    return res.status(400).json({
      ok: false,
      msg: "La fecha desde no puede ser mayor que hasta",
    });
  }
  try {
    const [metricasSemanales] = await db.query(
      `SELECT m.id, m.id_red, p.label_param AS red,
              CONVERT(varchar(10), m.semana_inicio, 23) AS semana_inicio,
              CONVERT(varchar(10), m.semana_fin, 23) AS semana_fin,
              m.seguidores, m.seguidores_ganados, m.seguidores_perdidos, m.posts, m.likes, m.comentarios
       FROM tb_metricas_semanales_redes m
       LEFT JOIN tb_parametros p ON p.id_param = m.id_red
       WHERE m.flag = 1 AND m.semana_fin >= :desde AND m.semana_inicio <= :hasta
       ORDER BY m.semana_inicio, m.id_red`,
      { replacements: { desde, hasta } },
    );
    res.status(200).json({
      desde,
      hasta,
      metricasSemanales,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema",
      error: error.message,
    });
  }
};

// Ultimas publicaciones de Facebook e Instagram (tb_publicaciones_redes, la llena el cron
// registrarPublicacionesDiario con las ultimas 50 de cada red).
// ?red=FACEBOOK|INSTAGRAM (opcional) &limite=N (opcional, por defecto 50, max 200)
// fecha sale como texto ISO en UTC (ej. 2026-11-05T13:36:03Z).
const getPublicacionesRedes = async (req = request, res = response) => {
  const red = req.query.red?.toUpperCase() || null;
  const limite = Math.max(1, Math.min(Number(req.query.limite) || 50, 200));
  try {
    const [publicaciones] = await db.query(
      `SELECT TOP (:limite) s.id, s.id_red, p.label_param AS red, s.id_publicacion,
              CONVERT(varchar(19), SWITCHOFFSET(s.fecha, '+00:00'), 126) + 'Z' AS fecha,
              s.tipo, s.publicacion AS texto, s.n_likes AS likes,
              s.n_comentarios AS comentarios, s.n_compartidos AS compartidos,
              s.n_visualizaciones AS visualizaciones
       FROM tb_publicaciones_redes s
       LEFT JOIN tb_parametros p ON p.id_param = s.id_red
       WHERE s.flag = 1 AND (:red IS NULL OR p.label_param = :red)
       ORDER BY s.fecha DESC, s.id_red`,
      { replacements: { limite, red } },
    );
    res.status(200).json({
      fakeData: false,
      publicaciones,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema",
      error: error.message,
    });
  }
};

module.exports = {
  getProspectosRedes,
  getCampaniasMeta,
  getSeguidoresRedes,
  getMetricasSemanalesRedes,
  getPublicacionesRedes,
};
