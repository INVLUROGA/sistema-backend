const { request, response } = require("express");
const { OrdenMesComparativo } = require("../models/OrdenMesComparativo");

// Orden guardado de cada mes (comparativo-mensual-ventas)
const getOrdenMeses = async (req = request, res = response) => {
  try {
    const ordenes = await OrdenMesComparativo.findAll({
      attributes: ["anio", "mes", "orden"],
      raw: true,
    });
    res.status(200).json({ ok: true, ordenes });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error al obtener el orden de los meses. Hable con el encargado de sistema",
    });
  }
};
// Guarda el orden de un mes; orden vacio lo borra
const putOrdenMes = async (req = request, res = response) => {
  try {
    const { anio, mes, orden } = req.body;
    if (anio === undefined || mes === undefined) {
      return res.status(400).json({ ok: false, msg: "Faltan anio o mes" });
    }
    const valor = orden === "" || orden === null || orden === undefined ? null : Number(orden);
    const existente = await OrdenMesComparativo.findOne({ where: { anio, mes } });
    if (existente) await existente.update({ orden: valor });
    else await OrdenMesComparativo.create({ anio, mes, orden: valor });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error al guardar el orden del mes. Hable con el encargado de sistema",
    });
  }
};

module.exports = {
  getOrdenMeses,
  putOrdenMes,
};
