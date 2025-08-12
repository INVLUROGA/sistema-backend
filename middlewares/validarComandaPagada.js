const { response, request } = require("express");
const { Venta } = require("../models/Venta");

const validarComandaPagada = async (req = request, res = response, next) => {
  try {
    const { id_venta } = req.params;
    const ventas = await Venta.findOne({
      where: { id: id_venta, status_remove: 1467 },
    });
    if (ventas) {
      return res.status(501).json({
        msg: "VENTA YA PAGADA",
      });
    }
    next();
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  validarComandaPagada,
};
