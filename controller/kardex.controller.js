const { request, response } = require("express");
const { MovimientoArticulo } = require("../models/MovimientoArticulo");
const { Articulos } = require("../models/Articulo");
const {
  updateArticuloxIDxMovimientos,
} = require("../middlewares/updateArticuloxIDxMovimientos");

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
      cantidad,
    } = req.body;
    const movimientoArticulo = await MovimientoArticulo.create({
      id_articulo: idArticulo,
      movimiento,
      id_lugar_destino,
      fechaCambio,
      observacion,
      id_motivo,
      cantidad,
      id_empresa,
    });
    await updateArticuloxIDxMovimientos(idArticulo);
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
    await updateArticuloxIDxMovimientos(movimientoArticulo?.id_articulo);
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
    await updateArticuloxIDxMovimientos(movimientoArticulo?.id_articulo);
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
