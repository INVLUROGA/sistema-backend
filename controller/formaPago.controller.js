const { response, request } = require("express");
const { OperadorPago } = require("../models/FormaPago.js");
const { FormaPago } = require("../models/Forma_Pago.js");
const { Parametros } = require("../models/Parametros.js");
const postFormaPago = async (req = request, res = response) => {
  try {
    const operadoresPago = await OperadorPago.create({ ...req.body });
    res.status(201).json({
      operadoresPago,
      ok: true,
    });
  } catch (error) {
    console.log({ error });

    res.status(501).json({
      msg: "false",
    });
  }
};
const getFormaPago = async (req = request, res = response) => {
  try {
    const operadoresPago = await OperadorPago.findAll({
      where: {
        flag: true,
      },
      include: [
        {
          model: Parametros,
          as: "OperadorLabel",
        },
        {
          model: Parametros,
          as: "FormaPagoLabel",
        },
        {
          model: Parametros,
          as: "TipoTarjetaLabel",
        },
        {
          model: Parametros,
          as: "TarjetaLabel",
        },
        {
          model: Parametros,
          as: "BancoLabel",
        },
      ],
    });
    res.status(201).json({
      operadoresPago,
    });
  } catch (error) {
    console.log({ error });
    res.status(501).json({
      ok: false,
    });
  }
};
const getFormaPagoxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const operadoresPago = await OperadorPago.findOne({
      where: {
        id,
      },
    });
    res.status(201).json({
      operadoresPago,
    });
  } catch (error) {
    res.status(501).json({
      ok: false,
    });
  }
};
const updateFormaPagoxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const operadoresPago = await OperadorPago.findOne({
      where: { id },
    });
    await operadoresPago.update(req.body);
    res.status(201).json({
      operadoresPago,
    });
  } catch (error) {
    res.status(501).json({
      ok: false,
    });
  }
};
const deleteFormaPagoxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const formaPago = await OperadorPago.findOne({ where: { id } });
    await formaPago.update({ flag: false });
    res.status(201).json({
      formaPago,
    });
  } catch (error) {
    res.status(501).json({
      ok: false,
    });
  }
};
module.exports = {
  postFormaPago,
  getFormaPago,
  getFormaPagoxID,
  updateFormaPagoxID,
  deleteFormaPagoxID,
};
