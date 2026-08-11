const { request, response } = require("express");
const { Producto } = require("../models/Producto");
const uid = require("uuid");
const { eliminarCaracter } = require("../helpers/isFormat");
const { Parametros } = require("../models/Parametros");
const { Proveedor } = require("../models/Proveedor");
const { GastosIgv } = require("../models/GastosFyV");

// === CREAR GASTO IGV ===
const postigv = async (req = request, res = response) => {
  try {
    const { id_empresa } = req.params;
    const gastoIgv = new GastosIgv({ ...req.body, id_empresa });
    await gastoIgv.save();
    res.status(200).json(gastoIgv);
  } catch (error) {
    console.error("Error postigv:", error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema",
    });
  }
};

const getIgvxEmpresa = async (req = request, res = response) => {
  try {
    const { id_empresa } = req.params;
    const gastosIgv = await GastosIgv.findAll({
      where: {
        flag: true,
        id_empresa: id_empresa,
      },
      order: [["id", "DESC"]],
    //   include: [
    //   ],
    });

    res.status(200).json({
      msg: true,
      gastosIgv,
    });
  } catch (error) {
    console.error("Error getigv:", error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema, getigv",
    });
  }
};

// === OBTENER UN GASTO IGV ===
const getigv = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const gastoIgv = await GastosIgv.findOne({
      where: { id: id, flag: true },
    });

    if (!gastoIgv) {
      return res.status(404).json({
        ok: false,
        msg: "El gasto IGV no existe o fue eliminado",
      });
    }

    res.status(200).json({
      ok: true,
      gastoIgv,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema (getigv)",
    });
  }
};

// === ACTUALIZAR GASTO IGV (CORREGIDO ERROR 500) ===
const updateIgv = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const gastoIgv = await GastosIgv.findByPk(id);

    if (!gastoIgv) {
      return res.status(404).json({
        ok: false,
        msg: "El gasto IGV no existe",
      });
    }

    await gastoIgv.update(req.body);

    res.status(200).json({
      ok: true,
      msg: "Gasto IGV actualizado correctamente",
      gastoIgv,
    });
  } catch (error) {
    console.error("Error updateIgv:", error); // Esto imprimirá el error real en tu consola backend
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema (updateIgv)",
      error: error.message, // Enviamos el detalle para que veas qué pasa en Postman
    });
  }
};

// === ELIMINAR GASTO IGV ===
const deleteIgv = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const gastoIgv = await GastosIgv.findByPk(id);

    if (!gastoIgv) {
      return res.status(404).json({
        ok: false,
        msg: "El gasto IGV no existe",
      });
    }
    await gastoIgv.update({ flag: false });
    res.status(200).json({
      ok: true,
      msg: "Gasto IGV eliminado correctamente",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema (deleteIgv)",
    });
  }
};
module.exports = {
  postigv,
  getigv,
  getIgvxEmpresa,
  updateIgv,
  deleteIgv,
};
