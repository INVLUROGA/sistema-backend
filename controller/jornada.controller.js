const { response, request } = require("express");
const { Jornada } = require("../models/Jornada");
const uuid = require("uuid");
const { Empleado } = require("../models/Usuarios");
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
module.exports = {
  obtenerTablaJornada,
  postJornada,
  obtenerJornadas,
  obtenerJornadaxEmpl,
};
