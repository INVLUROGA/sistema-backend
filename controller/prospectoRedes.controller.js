const { request, response } = require("express");
const { leadsxDia } = require("../models/Venta");
const {
  campaniasMetaPorCampania,
} = require("../middlewares/Redes/CampaniasMeta");

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

module.exports = {
  getProspectosRedes,
  getCampaniasMeta,
};
