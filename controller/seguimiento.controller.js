const { request, response } = require("express");
const { Seguimiento } = require("../models/Seguimientos");
const { detalleVenta_membresias, Venta } = require("../models/Venta");
const { Op } = require("sequelize");

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
module.exports = {
  getSeguimientos,
};
