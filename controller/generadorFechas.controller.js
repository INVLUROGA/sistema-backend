const { request, response } = require("express");
const { GeneradorFechas } = require("../models/GeneradorFechas");

const postGenerarFechas = async (req = request, res = response) => {
  try {
    const { nombre_fecha, fecha_inicio, fecha_fin, orden } = req.body;
    const { entidad, id_empresa } = req.params;
    const fechaGenerada = new GeneradorFechas({
      nombre_fecha,
      fecha_inicio,
      fecha_fin,
      orden,
      entidad,
      id_empresa,
    });
    await fechaGenerada.save();
    res.status(201).json({
      msg: "fechaGenerada correctamente",
      fechaGenerada,
    });
  } catch (error) {
    console.log(error);
  }
};
const getFechasxEntidadxEmpresa = async (req = request, res = response) => {
  try {
    const { entidad, id_empresa } = req.params;
    const dataFechas = await GeneradorFechas.findAll({
      where: { flag: true, id_empresa: id_empresa, entidad: entidad },
    });

    res.status(201).json({
      msg: "fechaGenerada correctamente",
      dataFechas,
    });
  } catch (error) {
    console.log(error);
  }
};
const removeFechasxId = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const encontrarFechaxId = await GeneradorFechas.findOne({ where: { id } });
    if (!encontrarFechaxId) {
      return res.status(404).json({ msg: "Fecha no encontrada" });
    }
    await encontrarFechaxId.update({ flag: false });
    res.status(200).json({ msg: "Fecha eliminada correctamente" });
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  postGenerarFechas,
  getFechasxEntidadxEmpresa,
  removeFechasxId,
};
