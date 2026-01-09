const { request, response } = require("express");
const { CuentaBalance } = require("../models/CuentaBalances");
const { Parametros } = require("../models/Parametros");
const { Proveedor } = require("../models/Proveedor");
const { Op } = require("sequelize");

// Crear CuentaBalance
const PostCuentaBalance = async (req = request, res = response) => {
  try {
    const { id_empresa, tipo } = req.params;
    await CuentaBalance.create({
      ...req.body,
      id_empresa,
      tipo,
    });
    res.status(201).json({ msg: "CuentaBalance creado correctamente" });
  } catch (error) {
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (PostCuentaBalance)",
    });
  }
};

// Obtener todos los CuentaBalances
const GetCuentaBalancesxIDEmpresaxTipo = async (
  req = request,
  res = response
) => {
  try {
    const { id_empresa, tipo } = req.params;
    const cuentasBalances = await CuentaBalance.findAll({
      where: {
        id_empresa: id_empresa,
        flag: true,
        tipo,
      },
      order: [["id", "desc"]],
      include: [
        {
          model: Parametros,
          as: "concepto",
        },
        {
          model: Proveedor,
        },
      ],
    });
    res.status(200).json({ msg: "CuentaBalances obtenidos", cuentasBalances });
  } catch (error) {
    res.status(500).json({
      msg: `ERROR EN LA BASE DE DATOS O SERVIDOR (GetCuentaBalances) ${error}`,
    });
  }
};

const GetCuentaBalancesxIDEmpresaxTipoxFecComprobante = async (
  req = request,
  res = response
) => {
  try {
    const { id_empresa, tipo } = req.params;
    const { arrayDate } = req.query;
    const fechaInicio = arrayDate[0];
    const fechaFin = arrayDate[1];
    const cuentasBalances = await CuentaBalance.findAll({
      where: {
        id_empresa: id_empresa,
        flag: true,
        tipo,
        fecha_comprobante: {
          [Op.between]: [fechaInicio, fechaFin],
        },
      },
      order: [["id", "desc"]],
      include: [
        {
          model: Parametros,
          as: "concepto",
        },
        {
          model: Proveedor,
        },
      ],
    });
    res.status(200).json({ msg: "CuentaBalances obtenidos", cuentasBalances });
  } catch (error) {
    res.status(500).json({
      msg: `ERROR EN LA BASE DE DATOS O SERVIDOR (GetCuentaBalances) ${error}`,
    });
  }
};

// Obtener CuentaBalance por ID
const GetCuentaBalancexID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const { arrayRangeDate } = req.query;
    const cuenta = await CuentaBalance.findOne({
      where: {
        id,
        flag: true,
      },
    });
    res.status(200).json({ msg: "CuentaBalance obtenido", cuenta });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (GetCuentaBalance)" });
  }
};

// Eliminar CuentaBalance
const deleteCuentaBalancexID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const cuenta = await CuentaBalance.findOne({
      where: {
        id,
        flag: true,
      },
    });
    await cuenta.update({ flag: false });
    res.status(200).json({ msg: "CuentaBalance eliminado correctamente" });
  } catch (error) {
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (deleteCuentaBalance)",
    });
  }
};

// Actualizar CuentaBalance
const updateCuentaBalancexID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const cuenta = await CuentaBalance.findOne({
      where: {
        id,
        flag: true,
      },
    });
    await cuenta.update(req.body);
    res.status(200).json({ msg: "CuentaBalance actualizado correctamente" });
  } catch (error) {
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (updateCuentaBalance)",
    });
  }
};

module.exports = {
  PostCuentaBalance,
  GetCuentaBalancesxIDEmpresaxTipo,
  GetCuentaBalancexID,
  deleteCuentaBalancexID,
  updateCuentaBalancexID,
  GetCuentaBalancesxIDEmpresaxTipoxFecComprobante,
};
