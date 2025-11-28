const { request, response } = require("express");
const { MovimientoArticulo } = require("../models/MovimientoArticulo");

const obtenerMovimientosxArticulo = async (req = request, res = response) => {
  try {
    const { idArticulo, movimiento } = req.params;
    const movimientoArticulo = await MovimientoArticulo.findAll({
      where: { id_articulo: idArticulo, movimiento, flag: true },
    });
    res.status(201).json({
      movimientoArticulo,
    });
  } catch (error) {
    console.log(error);
  }
};
const postMovimientoxArticulo = async (req = request, res = response) => {
  try {
    const { idArticulo, movimiento } = req.params;
    const {
      id_lugar_destino,
      fechaCambio,
      observacion,
      id_motivo,
      id_empresa,
    } = req.body;
    const movimientoArticulo = await MovimientoArticulo.create({
      id_articulo: idArticulo,
      movimiento,
      id_lugar_destino,
      fechaCambio,
      observacion,
      id_motivo,
      id_empresa,
    });
    res.status(201).json({
      movimientoArticulo,
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      msg: `error: ${error}`,
    });
  }
};
const obtenerMovimientoxId = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const movimientoArticulo = await MovimientoArticulo.findOne({
      where: { id },
    });
    res.status(201).json({
      movimientoArticulo,
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      msg: `error: ${error}`,
    });
  }
};
const updateMovimientoArticuloxId = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const movimientoArticulo = await MovimientoArticulo.findOne({
      where: { id },
    });
    await MovimientoArticulo.update(req.body);
    res.status(201).json({
      movimientoArticulo,
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      msg: `error: ${error}`,
    });
  }
};
const deleteMovimientoArticuloxId = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const movimientoArticulo = await MovimientoArticulo.findOne({
      where: { id },
    });
    await movimientoArticulo.update({ flag: false });
    res.status(201).json({
      movimientoArticulo,
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      msg: `error: ${error}`,
    });
  }
};
module.exports = {
  obtenerMovimientoxId,
  obtenerMovimientosxArticulo,
  postMovimientoxArticulo,
  updateMovimientoArticuloxId,
  deleteMovimientoArticuloxId,
};
