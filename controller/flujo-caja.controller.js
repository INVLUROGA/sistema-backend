const { response, request } = require("express");
const { FlujoCaja } = require("../models/flujo-caja");
const { Op } = require("sequelize");
const { ParametroGastos, ParametroGrupo } = require("../models/GastosFyV");

const obtenerFlujoCajaxFecha = async (req = request, res = response) => {
  try {
    const { arrayDate } = req.query;
    const { id_empresa } = req.params;
    const fechaInicio = arrayDate[0];
    const fechaFin = arrayDate[1];
    const flujoCaja = await FlujoCaja.findAll({
      where: {
        fecha_comprobante: {
          [Op.gte]: fechaInicio,
          [Op.lte]: fechaFin,
        },
      },
      include: [
        {
          model: ParametroGastos,
          attributes: [
            "id_empresa",
            "nombre_gasto",
            "grupo",
            "orden",
            "id_tipoGasto",
            "monto_proyectado",
            "fecha_inicio",
            "fecha_fin",
            "sin_limite",
          ],
          where: {
            id_empresa: id_empresa,
          },
          include: [
            {
              model: ParametroGrupo,
              as: "parametro_grupo",
            },
          ],
        },
      ],
    });
    res.status(201).json({
      data: flujoCaja,
    });
  } catch (error) {
    console.log(error);
  }
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
  id_empresa,
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
      id_empresa,
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
  id_empresa,
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
      id_empresa,
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
  obtenerFlujoCajaxFecha,
  postFlujoCaja,
  updateFlujoCaja,
  deleteFlujoCaja,
};
