const { request, response } = require("express");
const {
  Impuesto,
  HistorialImpuesto,
  ImpuestosPOS,
} = require("../models/Impuesto");
const { Sequelize } = require("sequelize");

const postImpuesto = async (req = request, res = response) => {
  try {
    const impuesto = new Impuesto(req.body);
    await impuesto.save();
    res.status(200).json({
      impuesto,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de HISTORYpostImpuesto, hable con el administrador: ${error}`,
    });
  }
};
const getImpuesto = async (req = request, res = response) => {
  try {
    const impuestos = await Impuesto.findAll({
      where: { flag: true },
      attributes: ["id", "name_impuesto"],
      include: [
        {
          model: HistorialImpuesto,
          attributes: [
            "multiplicador",
            "id_impuesto",
            "id",
            "fec_inicio",
            "fec_fin",
          ],
        },
      ],
    });
    res.status(200).json({
      impuestos,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de getImpuesto, hable con el administrador: ${error}`,
    });
  }
};

const HISTORYpostImpuesto = async (req = request, res = response) => {
  try {
    const { multiplicador, fec_fin, fec_inicio } = req.body;
    const { id_impuesto } = req.params;
    const history = new HistorialImpuesto({
      id_impuesto,
      multiplicador,
      fec_fin,
      fec_inicio,
    });
    const ultimoHistory = await HistorialImpuesto.findOne({
      where: { id_impuesto },
      order: [["fec_inicio", "DESC"]],
    });
    await history.save();
    await ultimoHistory.update({ fec_fin: fec_inicio });
    res.status(200).json({
      history,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de HISTORYpostImpuesto, hable con el administrador: ${error}`,
    });
  }
};
const HISTORYgetxImpuesto = async (req = request, res = response) => {
  const { id_impuesto } = req.params;
  try {
    const historia = await HistorialImpuesto.findAll({
      where: { flag: true, id_impuesto: id_impuesto },
      attributes: ["id", "multiplicador", "fec_inicio", "fec_fin"],
    });
    res.status(200).json({
      historia,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de HISTORYpostImpuesto, hable con el administrador: ${error}`,
    });
  }
};
const getHistoryImpuesto = () => {};
const obtenerImpuestoIGV = async (req = request, res = response) => {
  const hoy = new Date();
  try {
    const ImpuestoActual = await HistorialImpuesto.findOne({
      attributes: ["multiplicador"],
      where: {
        fec_inicio: { [Sequelize.Op.lte]: hoy },
        fec_fin: { [Sequelize.Op.gte]: hoy },
        id_impuesto: 4,
      },
      order: [["fec_inicio", "DESC"]],
    });
    res.status(200).json({
      ImpuestoActual,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de HISTORYpostImpuesto, hable con el administrador: ${error}`,
    });
  }
};

// IMPUESTO POS
const postPOS = async (req = request, res = response) => {
  try {
    const impuestoPOS = await ImpuestosPOS.create(req.body);
    res.status(201).json({
      ok: true,
    });
  } catch (error) {
    console.log(error);
  }
};
const updatePOSxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const impuestoPOS = await ImpuestosPOS.findOne({ where: { id } });
    await impuestoPOS.update(req.body);
    res.status(201).json({
      ok: true,
    });
  } catch (error) {
    console.log(error);
  }
};
const obtenerPOSxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const impuestoPOS = await ImpuestosPOS.findOne({ where: { id } });
    res.status(201).json({
      impuestoPOS,
    });
  } catch (error) {
    console.log(error);
  }
};
const deletePOSxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const impuestoPOS = await ImpuestosPOS.findOne({ where: { id } });
    await impuestoPOS.update({ flag: false });
    res.status(201).json({
      impuestoPOS,
      ok: true,
    });
  } catch (error) {
    console.log(error);
  }
};
const obtenerPOSs = async (req = request, res = response) => {
  try {
    const impuestoPOSs = await ImpuestosPOS.findAll({ where: { flag: true } });
    res.status(201).json({
      impuestoPOSs,
    });
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  postPOS,
  updatePOSxID,
  obtenerPOSxID,
  deletePOSxID,
  obtenerPOSs,
  HISTORYpostImpuesto,
  postImpuesto,
  HISTORYgetxImpuesto,
  getImpuesto,
  getHistoryImpuesto,
  obtenerImpuestoIGV,
};
