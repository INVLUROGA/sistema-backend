const { request, response } = require("express");
const { Seguimiento } = require("../models/Seguimientos");
const { detalleVenta_membresias, Venta } = require("../models/Venta");
const { Op } = require("sequelize");
const { ProgramaTraining } = require("../models/ProgramaTraining");
const { Cliente } = require("../models/Usuarios");

const getSeguimientos = async (req = request, res = response) => {
  try {
    const seguimiento = await Seguimiento.findAll({
      where: {
        flag: true,
        fecha_vencimiento: {
          [Op.ne]: null, // 👈 no null
        },
      },
      order: [["id", "desc"]],
      include: [
        {
          model: Cliente,
          as: "cli",
        },
        {
          model: detalleVenta_membresias,
          attributes: ["tarifa_monto", "id_pgm", "id", "id_venta"],
          as: "venta",
          include: [
            {
              model: Venta,
              attributes: ["id", "id_cli", "id_origen", "fecha_venta"],
            },
          ],
        },
      ],
    });
    res.status(201).json({
      seguimiento,
    });
  } catch (error) {
    console.log(error);
  }
};
const obtenerSeguimientosxIdCli = async (req = request, res = response) => {
  try {
    const { id_cli } = req.params;
    const seguimientos = await Seguimiento.findAll({
      where: { flag: true },
      include: [
        {
          model: detalleVenta_membresias,
          as: "venta",
          required: true,
          include: [
            {
              model: ProgramaTraining,
            },
            {
              model: Venta,
              required: true,
              where: { id_cli },
            },
          ],
        },
      ],
    });
    console.log({ id_cli });

    res.status(201).json({
      seguimientos,
    });
  } catch (error) {
    console.log(error);
  }
};
const getSeguimientoxFechaVencimientos = async (
  req = request,
  res = response,
) => {
  try {
    const { arrayDate } = req.query;
    const fecha_inicial = arrayDate[0];
    const fecha_final = arrayDate[1];
    const dataSeguimiento = await Seguimiento.findAll({
      where: {
        flag: true,
        fecha_vencimiento: {
          [Op.between]: [fecha_inicial, fecha_final],
        },
      },
      order: [["id", "desc"]],
      include: [
        {
          model: Cliente,
          as: "cli",
        },
        {
          model: detalleVenta_membresias,
          attributes: ["tarifa_monto", "id_pgm", "id", "id_venta"],
          as: "venta",
          include: [
            {
              model: Venta,
              attributes: ["id", "id_cli", "id_origen", "fecha_venta"],
            },
          ],
        },
      ],
    });
    res.status(201).json({
      dataSeguimiento,
    });
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  getSeguimientos,
  obtenerSeguimientosxIdCli,
  getSeguimientoxFechaVencimientos,
};
