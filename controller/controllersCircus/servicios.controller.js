const { response, request } = require("express");
const { VentaTem } = require("../../models/modelsCircus/DataVentaTemporal");
const { ServiciosCircus } = require("../../models/modelsCircus/Servicios");
const { Parametros } = require("../../models/Parametros");
const { Servicios } = require("../../models/Servicios");
const { Op } = require("sequelize");

const obtenerServiciosActivos = async (req, res) => {
  try {
    const servicios = await ServiciosCircus.findAll({
      include: [
        {
          model: Parametros,
        },
      ],
    });

    res.status(200).json({
      msg: "success",
      servicios,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: `Error en el servidor, en controller de postGasto, hable con el administrador: ${error}`,
    });
  }
};
const obtenerVentasTemporales = async (req = request, res = response) => {
  const { arrayDate } = req.query;
  const fechaInicio = arrayDate[0];
  const fechaFin = arrayDate[1];
  try {
    const ventasTem = await VentaTem.findAll({
      where: {
        fecha: {
          [Op.between]: [
            new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
            new Date(fechaFin).setUTCHours(23, 59, 59, 999),
          ],
        },
      },
    });
    res.status(201).json({
      ventasTem,
    });
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  obtenerServiciosActivos,
  obtenerVentasTemporales,
};
