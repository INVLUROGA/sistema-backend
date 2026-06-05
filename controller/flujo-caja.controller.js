const { response, request } = require("express");
const { FlujoCaja } = require("../models/flujo-caja");

const obtenerFlujoCaja = (req = request, res = response) => {
  const { arrayDate } = req.query;
};
const postFlujoCaja = async ({
  id_registro = 0,
  tipo_movimiento = "",
  id_concepto = 0,
  fecha_comprobante = new Date(),
  fecha_pago = new Date(),
  monto,
  id_estado,
  moneda,
}) => {
  try {
    await FlujoCaja.create({
      id_registro,
      tipo_movimiento,
      id_concepto,
      fecha_comprobante,
      fecha_pago,
      monto,
      id_estado,
      moneda,
    });
  } catch (error) {
    console.log(error);
  }
};
const updateFlujoCaja = async ({
  id_registro = 0,
  id_concepto = 0,
  fecha_comprobante = new Date(),
  fecha_pago = new Date(),
  monto,
  id_estado,
  moneda,
}) => {
  try {
    const flujocaja = await FlujoCaja.findOne({ where: { id_registro } });
    await flujocaja.update({
      id_concepto,
      fecha_comprobante,
      fecha_pago,
      monto,
      id_estado,
      moneda,
    });
  } catch (error) {
    console.log(error);
  }
};
const deleteFlujoCaja = async (id_registro = 0) => {
  try {
    const flujocaja = await FlujoCaja.findOne({ where: { id_registro } });
    await flujocaja.update({
      flag: false,
    });
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  obtenerFlujoCaja,
  postFlujoCaja,
  updateFlujoCaja,
  deleteFlujoCaja,
};
