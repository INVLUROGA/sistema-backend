const { request, response } = require("express");
const { Seguimiento } = require("../models/Seguimientos");
const { detalleVenta_membresias, Venta } = require("../models/Venta");
const { Op } = require("sequelize");
const { ProgramaTraining } = require("../models/ProgramaTraining");

const getSeguimientos = async (req = request, res = response) => {
  try {
    const seguimiento = await Seguimiento.findAll({
      where: {
        flag: true,
        fecha_vencimiento: {
          [Op.ne]: null, // 👈 no null
        },
      },
      include: [
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
module.exports = {
  getSeguimientos,
  obtenerSeguimientosxIdCli,
};
