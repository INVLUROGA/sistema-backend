const { response, request } = require("express");
const {
  Jornada,
  contrato_empleado,
  tipoHorarioContrato,
} = require("../models/Jornada");
const uuid = require("uuid");
const { Empleado } = require("../models/Usuarios");
const { Op } = require("sequelize");
const obtenerTablaJornada = () => {};
const postJornada = async (req = request, res = response) => {
  try {
    const { formState, observacion } = req.body;
    const { id_enterprice } = req.params;
    const uid_jornada = uuid.v4();
    const dataTransformer = formState.map((f) => {
      return {
        uid_jornada: uid_jornada,
        observacion: observacion,
        semana: f.semana,
        LUNES_ENTRADA: f.days.find((d) => d.day === "LUNES").hora_entrada,
        LUNES_SALIDA: f.days.find((d) => d.day === "LUNES").hora_salida,

        MARTES_ENTRADA: f.days.find((d) => d.day === "MARTES").hora_entrada,
        MARTES_SALIDA: f.days.find((d) => d.day === "MARTES").hora_salida,

        MIERCOLES_ENTRADA: f.days.find((d) => d.day === "MIERCOLES")
          .hora_entrada,
        MIERCOLES_SALIDA: f.days.find((d) => d.day === "MIERCOLES").hora_salida,

        JUEVES_ENTRADA: f.days.find((d) => d.day === "JUEVES").hora_entrada,
        JUEVES_SALIDA: f.days.find((d) => d.day === "JUEVES").hora_salida,

        VIERNES_ENTRADA: f.days.find((d) => d.day === "VIERNES").hora_entrada,
        VIERNES_SALIDA: f.days.find((d) => d.day === "VIERNES").hora_salida,

        SABADO_ENTRADA: f.days.find((d) => d.day === "SABADO").hora_entrada,
        SABADO_SALIDA: f.days.find((d) => d.day === "SABADO").hora_salida,

        DOMINGO_ENTRADA: f.days.find((d) => d.day === "DOMINGO").hora_entrada,
        DOMINGO_SALIDA: f.days.find((d) => d.day === "DOMINGO").hora_salida,
        id_enterprice: id_enterprice,
      };
    });
    const jornada = await Jornada.bulkCreate(dataTransformer);
    res.status(201).json({
      message: "Jornada creada con éxito",
      jornada,
    });
    console.log("success");
  } catch (error) {
    console.log(error);
  }
};
const obtenerJornadas = async (req = request, res = response) => {
  try {
    const jornadas = await Jornada.findAll({ where: { flag: true } });
    res.status(200).json({ jornadas });
  } catch (error) {
    console.log(error);
  }
};

const obtenerJornadaxEmpl = async (req = request, res = response) => {
  try {
    const { uid_empl } = req.params;
    const empleado = await Empleado.findOne({ where: { uid: uid_empl } });
    const jornadas = await Jornada.findAll({
      where: { uid_jornada: empleado.uid_jornada },
    });
    res.status(200).json({ jornadas });
  } catch (error) {
    console.log(error);
  }
};

const postContratoJornadaEmpleado = async (req = request, res = response) => {
  try {
    const { id_empl } = req.params;
    const { fecha_inicio, fecha_fin, sueldo, id_cargo, observacion } = req.body;
    const contrato = new contrato_empleado({
      id_empl,
      fecha_inicio,
      fecha_fin,
      id_cargo,
      sueldo,
      observacion,
    });
    await contrato.save();
    res.status(201).json({
      msg: "CONTRATO CREADO CON EXITO",
      contrato,
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      msg: "ERROR",
      error,
    });
  }
};
const obtenerContratosxEmpleado = async (req = request, res = response) => {
  try {
    const { id_empl } = req.params;
    const contratos = await contrato_empleado.findAll({
      where: { id_empl: id_empl },
    });
    res.status(201).json({
      contratos,
    });
  } catch (error) {
    console.log(error);
  }
};
const postTipoHorarioContrato = async (req = request, res = response) => {
  try {
    await tipoHorarioContrato.bulkCreate(req.body);
    res.status(201).json({
      msg: "ok",
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      error,
    });
  }
};
const obtenerContratosxFecha = async (req = request, res = response) => {
  try {
    const { arrayFecha } = req.query;
    // Si viene como string JSON
    if (typeof arrayFecha === "string") {
      arrayFecha = JSON.parse(arrayFecha);
    }
    const fecha_desde = arrayFecha[0];
    const fecha_hasta = arrayFecha[1];
    console.log({
      fecha_desde,
      fecha_hasta,
      arrayFecha,
      tm: [
        new Date(fecha_desde).toISOString(),
        new Date(fecha_hasta).toISOString(),
      ],
    });
    const empleados = await Empleado.findAll({
      where: { flag: true, estado_empl: true },
      include: [
        {
          model: contrato_empleado,
          required: true,
          as: "_empl",
          include: [
            {
              model: tipoHorarioContrato,
              where: {
                fecha: {
                  [Op.between]: [
                    new Date(fecha_desde).toISOString(),
                    new Date(fecha_hasta).toISOString(),
                  ],
                },
              },
              order: [["fecha", "desc"]],
              required: true,
              as: "contrato_empl",
            },
          ],
        },
      ],
    });
    res.status(201).json({
      msg: "ok",
      contratos: [],
      empleados,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "error",
      error,
    });
  }
};
const obtenerDiasLaborablesxIdContrato = async (
  req = request,
  res = response
) => {
  try {
    const { idContrato } = req.params;
    const diasLaborablesEnContrato = await tipoHorarioContrato.findAll({
      where: { id_contrato: idContrato, flag: true },
    });
    console.log({ diasLaborablesEnContrato });

    res.status(201).json({
      diasLaborablesEnContrato,
    });
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  obtenerTablaJornada,
  postJornada,
  obtenerJornadas,
  obtenerJornadaxEmpl,
  postContratoJornadaEmpleado,
  obtenerContratosxEmpleado,
  postTipoHorarioContrato,
  obtenerContratosxFecha,
  obtenerDiasLaborablesxIdContrato,
};
