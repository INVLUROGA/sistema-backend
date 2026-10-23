const { response, request } = require("express");
const { Gastos, ParametroGastos } = require("../models/GastosFyV");
const { Op } = require("sequelize");
const { Proveedor } = require("../models/Proveedor");
const { Empleado, Cliente, Usuario } = require("../models/Usuarios");
const { Parametros } = require("../models/Parametros");
const { detalleVenta_membresias } = require("../models/Venta");
const { jornadaPlanilla, Jornada } = require("../models/Jornada");
const uuid = require("uuid");
const { db } = require("../database/sequelizeConnection");
const { sql, poolPromise } = require("../database/connectionSQLserver");
const { fechaHoraLima } = require("../services/transactionService");
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
      where: { uid_empleado: uid_empl, flag: true },
      order: [["fecha_desde", "DESC"]],
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
    const dni = String(empleado?.numDoc_empl ?? "").trim();
    if (!planilla || !dni) {
      return res.status(200).json([]);
    }

    // Periodo en días de Perú; sin fecha_hasta el periodo llega hasta hoy
    const desde = new Date(planilla.fecha_desde).toISOString().slice(0, 10);
    const hasta = planilla.fecha_hasta
      ? new Date(planilla.fecha_hasta).toISOString().slice(0, 10)
      : fechaHoraLima(new Date()).fecha;
    const inicio = new Date(`${desde}T00:00:00-05:00`);
    const fin = new Date(`${hasta}T00:00:00-05:00`);
    fin.setUTCDate(fin.getUTCDate() + 1); // hasta el final del día "hasta"

    // Marcaciones del huellero (zk_Transactions) por DNI: zk_Transactions.dni = tb_empleados.numDoc_empl
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("dni", sql.VarChar(30), dni)
      .input("inicio", sql.DateTimeOffset, inicio)
      .input("fin", sql.DateTimeOffset, fin)
      .query(`
        SELECT t.Id, t.Device, t.PunchTime
        FROM dbo.zk_Transactions t
        WHERE t.dni = @dni
          AND t.PunchTime >= @inicio AND t.PunchTime < @fin
        ORDER BY t.PunchTime ASC, t.Id ASC
      `);

    // El reporte del frontend lee tiempo_marcacion_new como hora de Perú en formato UTC (dayjs.utc)
    const marcaciones = result.recordset.map((t) => {
      const { fecha, hora } = fechaHoraLima(t.PunchTime);
      return {
        id: t.Id,
        dni,
        nombre_dispostivo: t.Device,
        tiempo_marcacion_new: `${fecha}T${hora}.000Z`,
      };
    });
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
const updatePlanillaxID = async (req = request, res = response) => {
  try {
    const { id_planilla } = req.params;
    const {
      fecha_desde,
      observacion,
      sueldo,
      tipo_pago,
      tipo_jornada,
      fecha_pago,
    } = req.body;
    const planilla = await jornadaPlanilla.findOne({
      where: { id: id_planilla, flag: true },
    });
    if (!planilla) {
      return res.status(404).json({ msg: "Planilla no encontrada" });
    }
    await planilla.update({
      fecha_desde,
      observacion,
      sueldo,
      tipo_pago,
      tipo_jornada,
      fecha_pago,
    });
    res.status(200).json(planilla);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
const deletePlanillaxID = async (req = request, res = response) => {
  try {
    const { id_planilla } = req.params;
    const planilla = await jornadaPlanilla.findOne({
      where: { id: id_planilla, flag: true },
    });
    if (!planilla) {
      return res.status(404).json({ msg: "Planilla no encontrada" });
    }
    await planilla.update({ flag: false });
    res.status(200).json({ msg: "Planilla eliminada correctamente" });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
// Columnas de tb_jornada_semanas con el horario de cada día ("HH:mm"; "00:00" = no trabaja)
const COLUMNAS_JORNADA = [
  "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO",
].flatMap((dia) => [`${dia}_ENTRADA`, `${dia}_SALIDA`]);
const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// Horario del contrato (planilla): una semana, o dos que se alternan (intersemana).
// semanas = [] si aún no tiene.
const obtenerJornadaxPlanilla = async (req = request, res = response) => {
  try {
    const { id_planilla } = req.params;
    const planilla = await jornadaPlanilla.findOne({
      where: { id: id_planilla, flag: true },
    });
    if (!planilla) {
      return res.status(404).json({ msg: "Planilla no encontrada" });
    }
    const semanas = planilla.uid_jornada
      ? await Jornada.findAll({
          where: { uid_jornada: planilla.uid_jornada },
          order: [["semana", "ASC"]],
        })
      : [];
    res.status(200).json({ fecha_desde: planilla.fecha_desde, semanas });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
// Guarda el horario del contrato. Las semanas se repiten en ciclo desde la fecha_desde de la
// planilla (semana 1 = la semana en que empezó el trabajo; con intersemana: 1, 2, 1, 2...).
// Body: { semanas: [{ LUNES_ENTRADA: "07:00", LUNES_SALIDA: "15:00", ... }, {...}?] }
const updateJornadaxPlanilla = async (req = request, res = response) => {
  try {
    const { id_planilla } = req.params;
    const planilla = await jornadaPlanilla.findOne({
      where: { id: id_planilla, flag: true },
    });
    if (!planilla) {
      return res.status(404).json({ msg: "Planilla no encontrada" });
    }
    const { semanas } = req.body;
    if (!Array.isArray(semanas) || semanas.length < 1 || semanas.length > 2) {
      return res.status(400).json({ msg: "Envía 1 semana, o 2 si es intersemana" });
    }
    const horarios = [];
    for (const [i, semana] of semanas.entries()) {
      const horario = {};
      for (const columna of COLUMNAS_JORNADA) {
        const hora = semana?.[columna] || "00:00";
        if (!FORMATO_HORA.test(hora)) {
          return res.status(400).json({ msg: `Hora no válida en semana ${i + 1}, ${columna}` });
        }
        horario[columna] = hora;
      }
      horarios.push(horario);
    }

    const uid_jornada = planilla.uid_jornada || uuid.v4();
    await db.transaction(async (transaction) => {
      // Se reemplazan las semanas del contrato (pasar de intersemana a una semana quita la 2)
      await Jornada.destroy({ where: { uid_jornada }, transaction });
      await Jornada.bulkCreate(
        horarios.map((horario, i) => ({
          ...horario,
          uid_jornada,
          semana: String(i + 1),
          observacion: `planilla ${planilla.id}`,
          id_enterprice: planilla.id_enterprice,
        })),
        { transaction }
      );
      if (!planilla.uid_jornada) {
        await planilla.update({ uid_jornada }, { transaction });
      }
    });
    res.status(200).json({ ok: true });
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
  updatePlanillaxID,
  deletePlanillaxID,
  obtenerJornadaxPlanilla,
  updateJornadaxPlanilla,
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
