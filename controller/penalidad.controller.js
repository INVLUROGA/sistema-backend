const { response, request } = require("express");
const { Penalidad } = require("../models/Penalidad");
const getPenalidadxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const penalidad = await Penalidad.findAll({
      where: {
        id,
      },
    });
    res.status(201).json({
      penalidad,
    });
  } catch (error) {
    res.status(501).json({
      ok: false,
    });
  }
};
const postPenalidad = async (req = request, res = response) => {
  try {
    const { id_contrato } = req.params;
    const penalidad = await Penalidad.create({ ...req.body, id_contrato });
    res.status(201).json({
      penalidad,
      ok: true,
    });
  } catch (error) {
    res.status(501).json({
      msg: "false",
    });
  }
};
const getPenalidadxIDContrato = async (req = request, res = response) => {
  try {
    const { id_contrato } = req.params;
    const penalidades = await Penalidad.findAll({
      where: {
        id_contrato,
      },
    });
    res.status(201).json({
      penalidades,
    });
  } catch (error) {
    res.status(501).json({
      ok: false,
    });
  }
};
const onPutPenalidadxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const penalidad = await Penalidad.findOne({
      where: { id },
    });
    penalidad.update(req.body);
    res.status(201).json({
      penalidad,
    });
  } catch (error) {
    res.status(501).json({
      ok: false,
    });
  }
};
const onDeletePenalidadxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const penalidad = await Penalidad.findOne({ where: { id } });
    penalidad.update({ flag: false });
    res.status(201).json({
      penalidad,
    });
  } catch (error) {
    res.status(501).json({
      ok: false,
    });
  }
};
const getPenalidades = async (req = request, res = response) => {
  try {
    const penalidad = await Penalidad.findAll({
      where: {
        flag: true,
      },
    });
    res.status(201).json({
      penalidad,
    });
  } catch (error) {
    res.status(501).json({
      ok: false,
    });
  }
};
module.exports = {
  postPenalidad,
  getPenalidadxIDContrato,
  onPutPenalidadxID,
  onDeletePenalidadxID,
  getPenalidadxID,
  getPenalidades,
};
