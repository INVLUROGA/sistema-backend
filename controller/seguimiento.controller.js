const { request, response } = require("express");
const { Seguimiento } = require("../models/Seguimientos");
const { detalleVenta_membresias, Venta } = require("../models/Venta");
const { Op } = require("sequelize");
const { ProgramaTraining } = require("../models/ProgramaTraining");
const { Cliente } = require("../models/Usuarios");

const getSeguimientos = async (req = request, res = response) => {
  try {
    const dataSeguimiento = await Seguimiento.findAll({
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
      dataSeguimiento,
    });
  } catch (error) {
    console.log(error);
  }
};
const obtenerSeguimientosxIdCli = async (req = request, res = response) => {
  try {
    const dataSeguimiento = await Cliente.findAll({
      attributes: ["id_cli", "nombre_cli", "apPaterno_cli", "apMaterno_cli"],
      include: [
        {
          model: Seguimiento,
          as: "cli_seguimiento",
          where: {
            flag: true,
          },
          order: [["id", "asc"]],
          include: [
            {
              model: detalleVenta_membresias,
              attributes: [
                "tarifa_monto",
                "id_pgm",
                "id",
                "id_venta",
                "fecha_inicio",
              ],
              as: "venta",
              include: [
                {
                  model: Venta,
                  attributes: ["id", "id_cli", "id_origen", "fecha_venta"],
                  required: true,
                  where: {
                    id_empresa: 598,
                  },
                },
              ],
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
