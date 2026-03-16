const { response, request } = require("express");
const { contrato_empleado, JornadaSemanal } = require("../models/Jornada");
const { Parametros } = require("../models/Parametros");
const { Empleado } = require("../models/Usuarios");

const obtenerContratosxEmpleado = async (req = request, res = response) => {
  try {
    const { id_empl } = req.params;
    const contratos = await contrato_empleado.findAll({
      where: { id_empl, flag: true },
      include: [
        {
          model: JornadaSemanal,
          as: "contrato_semana",
        },
      ],
    });
    res.status(201).json({
      contratos,
      ok: true,
    });
  } catch (error) {
    console.log(error);
  }
};
const postContratos = async (req = request, res = response) => {
  try {
    const { id_empl } = req.params;
    const contratos = await contrato_empleado.create({ ...req.body, id_empl });
    res.status(201).json({
      contratos,
      ok: true,
    });
  } catch (error) {
    console.log(error);
  }
};

const putContratosxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const { formState } = req.body;
    const contrato = await contrato_empleado.findOne({ where: { id } });
    await contrato.update(req.body);
    res.status(201).json({
      contrato,
      ok: true,
    });
  } catch (error) {
    console.log(error);
  }
};
const deleteContratosxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const contrato = await contrato_empleado.findOne({ where: { id } });
    await contrato.update({ flag: false });
    res.status(201).json({
      contrato,
      ok: true,
    });
  } catch (error) {
    console.log(error);
  }
};
const obtenerContratoxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const contrato = await contrato_empleado.findOne({ where: { id } });
    res.status(201).json({
      contrato,
      ok: true,
    });
  } catch (error) {
    console.log(error);
  }
};
const postSemanasxContrato = async (req = request, res = response) => {
  try {
    const { id_contrato } = req.params;
    console.log(req.body);

    const semanas = await JornadaSemanal.bulkCreate(req.body);
    res.status(201).json({
      id_contrato,
      ok: true,
      msg: "aquiiii",
    });
  } catch (error) {
    console.log(error);
  }
};
const obtenerSemanasxContrato = async (req = request, res = response) => {
  try {
    const { id_empresa } = req.params;
    const empleados = await Empleado.findAll({
      where: {
        estado_empl: true,
        flag: true,
        id_empresa,
      },
      include: [
        {
          model: contrato_empleado,
          as: "_empl",
          where: {
            estado: true,
            flag: true,
          },
          include: [
            {
              model: JornadaSemanal,
              as: "contrato_semana",
              where: {
                estado: true,
                flag: true,
              },
            },
          ],
        },
      ],
    });

    res.status(201).json({
      msg: "",
      ok: true,
      empleados,
    });
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  obtenerContratosxEmpleado,
  postContratos,
  putContratosxID,
  deleteContratosxID,
  obtenerContratoxID,
  postSemanasxContrato,
  obtenerSemanasxContrato,
};
