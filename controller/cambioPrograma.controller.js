const { request, response } = require("express");
const { CambioPrograma } = require("../models/CambioPrograma");
const { detalle_cambioPrograma } = require("../models/Venta");

const obtenerTodoCambioPrograma = async (req = request, res = response) => {
  try {
    const cambioPrograma = await detalle_cambioPrograma.findAll({
      where: { flag: true },
    });
    res.status(201).json({
      data: cambioPrograma,
    });
  } catch (error) {
    res.status(501).json({
      msg: "ERROR EN OBTENER CAMBIO DE PROGRAMA",
    });
  }
};
const postCambioPrograma = async (req = request, res = response) => {
  try {
    const { id_cli, id_venta, id_pgm, id_horario, id_motivo, observacion } =
      req.body;
    const cambioPrograma = new detalle_cambioPrograma({
      id_cli,
      id_venta,
      id_pgm,
      id_horario,
      id_motivo,
      observacion,
      // Aquí se deben llenar los campos del cambio de programa
    });
    await cambioPrograma.save()
    res.status(201).json({
      data: 'cliente cambiado de programa con exito'
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      msg: "ERROR EN OBTENER CAMBIO DE PROGRAMA",
    });
  }
};
module.exports = {
  obtenerCambioPrograma: obtenerTodoCambioPrograma,
  postCambioPrograma,
};
