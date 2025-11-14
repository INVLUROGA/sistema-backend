const { response, request } = require("express");
const { Gastos, ParametroGastos } = require("../models/GastosFyV");
const { Op } = require("sequelize");
const { Proveedor } = require("../models/Proveedor");
const { Empleado, Cliente, Usuario } = require("../models/Usuarios");
const { Parametros } = require("../models/Parametros");
const { detalleVenta_membresias } = require("../models/Venta");
const { jornadaPlanilla } = require("../models/Jornada");
const { Marcacion } = require("../models/Marcacion");
const { DiasNoLaborables } = require("../models/feriado.model");
const { TiemposEspeciales } = require("../models/TiemposEspeciales.model");
const postContratosEmpl = async (req = request, res = response) => {
  const { uid_empl } = req.params;
  try {
    const empleado = await Empleado.findOne({ where: { uid_empl: uid_empl } });
    // const contrato = await ContratoEmpl
  } catch (error) {
    console.log(error);
  }
};
const postPlanillaxEmpl = async (req = request, res = response) => {
  try {
    const { uid_empleado } = req.params;
    // const {id_enter}
    console.log(req.body);

    const planilla = new jornadaPlanilla({
      ...req.body.formState,
      id_enterprice: req.body.id_enterprice,
      uid_empleado,
    });
    await planilla.save();
    res.status(200).json(planilla);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
const obtenerPlanillasxEmpl = async (req = request, res = response) => {
  try {
    const { uid_empl } = req.params;
    console.log(uid_empl);

    // const empleado = await Empleado.findOne({where: {}})
    const planillas = await jornadaPlanilla.findAll({
      where: { uid_empleado: uid_empl },
    });
    res.status(200).json(planillas);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
const obtenerAsistenciasxEmpl = async (req = request, res = response) => {
  try {
    const { uid_empleado, id_planilla } = req.params;
    const empleado = await Empleado.findOne({
      where: { uid: uid_empleado },
    });
    const planilla = await jornadaPlanilla.findOne({
      where: { id: id_planilla },
    });

    const marcaciones = await Marcacion.findAll({
      where: {
        dni: empleado.numDoc_empl,
        tiempo_marcacion_new: {
          [Op.between]: [
            new Date(planilla.fecha_desde).setUTCHours(0, 0, 0, 0),
            new Date(planilla.fecha_hasta).setUTCHours(23, 59, 59, 999),
          ],
        },
      },
    });
    console.log(planilla.fecha_desde, planilla.fecha_hasta);
    res.status(200).json(marcaciones);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: error.message,
    });
  }
};
const obtenerPlanillaxID = async (req = request, res = response) => {
  try {
    const { id_planilla } = req.params;
    const planilla = await jornadaPlanilla.findOne({
      where: { id: id_planilla },
    });
    res.status(200).json(planilla);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
const getobtenerPlanillaEmpleadoActivos = async (
  req = request,
  res = response
) => {
  try {
    const empleados = 0;
    res.status(200).json(empleados);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
const obtenerDiasNoLaborables = async (req = request, res = response) => {
  const { entidad } = req.params;
  try {
    const diasNoLaborables = await DiasNoLaborables.findAll({
      where: { flag: true, entidad },
    });
    res.status(200).json({
      diasNoLaborables,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
const postDiasNoLaborables = async (req = request, res = response) => {
  try {
    await DiasNoLaborables.create(req.body);
    res.status(201).json({
      msg: "creado correcto",
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
const updateDiasNoLaborables = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    // const diaNoLaborables =
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// tiempos-especiales

// Crear TiemposEspeciale
const PostTiemposEspeciale = async (req = request, res = response) => {
  try {
    const { entidad, id_empresa } = req.params;
    const {
      id_colaborador,
      fechaDesde,
      fechaHasta,
      conGoceSueldo,
      observacion,
      id_tipo,
      minutos,
      nombre,
    } = req.body;
    await TiemposEspeciales.create({
      nombre,
      id_colaborador,
      fechaDesde,
      fechaHasta,
      conGoceSueldo,
      observacion,
      id_tipo,
      minutos,
      entidad,
      id_empresa,
    });
    res.status(201).json({ msg: "TiemposEspeciale creado correctamente" });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (PostTiemposEspeciale)",
    });
  }
};

// Obtener todos los TiemposEspeciales
const GetTiemposEspeciales = async (req = request, res = response) => {
  try {
    const { entidad, id_empresa } = req.params;
    const tiempoEspeciales = await TiemposEspeciales.findAll({
      where: { flag: true, entidad, id_empresa },
    });
    res
      .status(200)
      .json({ msg: "TiemposEspeciales obtenidos", tiempoEspeciales });
  } catch (error) {
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (GetTiemposEspeciales)",
    });
  }
};

// Obtener TiemposEspeciale por ID
const GetTiemposEspecialxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const tiempoEspecial = await TiemposEspeciales.findOne({
      where: { id, flag: true },
    });
    res.status(200).json({ msg: "TiemposEspeciale obtenido", tiempoEspecial });
  } catch (error) {
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (GetTiemposEspeciale)",
    });
  }
};

// Eliminar TiemposEspeciale
const deleteTiemposEspecialxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const tiempoEspecial = await TiemposEspeciales.findOne({
      where: { id, flag: true },
    });
    await tiempoEspecial.update({ flag: false });
    res.status(200).json({ msg: "TiemposEspeciale eliminado correctamente" });
  } catch (error) {
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (deleteTiemposEspeciale)",
    });
  }
};

// Actualizar TiemposEspeciale
const updateTiemposEspecialxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const tiempoEspecial = await TiemposEspeciales.findOne({
      where: { id, flag: true },
    });
    await tiempoEspecial.update(req.body);
    res.status(200).json({ msg: "TiemposEspeciale actualizado correctamente" });
  } catch (error) {
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (updateTiemposEspeciale)",
    });
  }
};

module.exports = {
  postContratosEmpl,
  postPlanillaxEmpl,
  obtenerPlanillasxEmpl,
  obtenerAsistenciasxEmpl,
  obtenerPlanillaxID,
  getobtenerPlanillaEmpleadoActivos,
  obtenerDiasNoLaborables,
  postDiasNoLaborables,
  updateDiasNoLaborables,
  // tiempos especiales
  PostTiemposEspeciale,
  GetTiemposEspeciales,
  GetTiemposEspecialxID,
  deleteTiemposEspecialxID,
  updateTiemposEspecialxID,
};
