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
    // Un DNI de menos de 8 dígitos también se busca con ceros a la izquierda (7456276 = 07456276)
    const dniOchoDigitos = /^\d{1,7}$/.test(dni) ? dni.padStart(8, "0") : dni;
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("dni", sql.VarChar(30), dni)
      .input("dniOchoDigitos", sql.VarChar(30), dniOchoDigitos)
      .input("inicio", sql.DateTimeOffset, inicio)
      .input("fin", sql.DateTimeOffset, fin)
      .query(`
        SELECT t.Id, t.Device, t.PunchTime
        FROM dbo.zk_Transactions t
        -- marcaciones guardadas sin dni (antes de la columna) se buscan por el usuario del huellero
        WHERE (t.dni IN (@dni, @dniOchoDigitos)
               OR (t.dni IS NULL AND t.UserCode IN (
                     SELECT u.UserCode FROM dbo.zk_Users u
                     WHERE LTRIM(RTRIM(u.dni)) IN (@dni, @dniOchoDigitos))))
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
const DIAS_SEMANA = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
const sumarDia = (fecha) => {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
// Días laborables [{ fecha: YYYY-MM-DD, entrada: "HH:mm" }] de desde a hasta, ambos incluidos, según el horario del contrato:
// los días con horario. Las semanas se cuentan como en el reporte de asistencia (semana 1 = de
// desde al domingo siguiente, luego de lunes a domingo) y se repiten en ciclo (intersemana: 1, 2, 1, 2...).
function diasLaborables(desde, hasta, semanasJornada) {
  const dias = [];
  let semana = 0;
  for (let fecha = desde; fecha <= hasta; fecha = sumarDia(fecha)) {
    const diaSemana = new Date(`${fecha}T00:00:00Z`).getUTCDay();
    const jornada = semanasJornada[semana % semanasJornada.length];
    const entrada = jornada[`${DIAS_SEMANA[diaSemana]}_ENTRADA`];
    if (entrada && entrada !== "00:00") dias.push({ fecha, entrada });
    if (diaSemana === 0) semana++; // la semana cierra el domingo
  }
  return dias;
}

// Colaboradores con contrato (planilla): el contrato más reciente de cada uno.
// estado_empl indica si el colaborador sigue activo; semanas_jornada = 0 si no tiene jornada,
// 2 si es intersemana. El cargo (cargo_empl) se traduce en el frontend.
// dias_no_asistio: días con horario (editar jornada) sin marcación, desde que inició el contrato
// hasta ayer (hoy aún puede marcar) o hasta fecha_hasta. null si el contrato no tiene horario.
// minutos_tardanza: en los días asistidos con horario (hasta hoy), primera marcación - hora de entrada,
// en minutos completos, como el reporte de asistencia. null si el contrato no tiene horario.
const obtenerColaboradoresConContrato = async (req = request, res = response) => {
  try {
    const { id_enterprice } = req.params;
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("id_enterprice", sql.Int, id_enterprice)
      .query(`
        WITH ultimo AS (
          SELECT p.*,
                 ROW_NUMBER() OVER (PARTITION BY p.uid_empleado ORDER BY p.fecha_desde DESC, p.id DESC) AS n,
                 COUNT(*) OVER (PARTITION BY p.uid_empleado) AS cantidad_contratos
          FROM dbo.jornada_planillas p
          WHERE p.flag = 1 AND p.id_enterprice = @id_enterprice
        )
        SELECT u.id, u.uid_empleado, u.fecha_desde, u.fecha_hasta, u.uid_jornada, u.sueldo, u.tipo_pago,
               u.tipo_jornada, u.fecha_pago, u.observacion, u.cantidad_contratos,
               (SELECT COUNT(*) FROM dbo.tb_jornada_semanas j WHERE j.uid_jornada = u.uid_jornada) AS semanas_jornada,
               e.id_empl, e.nombre_empl, e.apPaterno_empl, e.apMaterno_empl, e.numDoc_empl,
               e.cargo_empl, e.estado_empl,
               -- días (hora de Perú) con al menos una marcación del huellero, desde que inició el contrato
               -- hasta hoy (o hasta fecha_hasta). Mismo criterio que el reporte de asistencia: por DNI
               -- "YYYY-MM-DD HH:mm" por día: la hora de la primera marcación (para las tardanzas)
               (SELECT STRING_AGG(CONCAT(CONVERT(CHAR(10), x.dia, 23), ' ', x.primera), ',')
                FROM (
                SELECT CAST(SWITCHOFFSET(t.PunchTime, '-05:00') AS DATE) AS dia,
                       CONVERT(CHAR(5), MIN(CAST(SWITCHOFFSET(t.PunchTime, '-05:00') AS TIME)), 108) AS primera
                FROM dbo.zk_Transactions t
                -- un DNI de menos de 8 dígitos también se busca con ceros a la izquierda (7456276 = 07456276)
                -- marcaciones guardadas sin dni (antes de la columna) se buscan por el usuario del huellero
                CROSS APPLY (SELECT LTRIM(RTRIM(e.numDoc_empl)) AS doc,
                                    CASE WHEN LEN(LTRIM(RTRIM(e.numDoc_empl))) < 8
                                         THEN RIGHT('00000000' + LTRIM(RTRIM(e.numDoc_empl)), 8) END AS doc8) d
                WHERE (t.dni IN (d.doc, d.doc8)
                       OR (t.dni IS NULL AND t.UserCode IN (
                             SELECT zu.UserCode FROM dbo.zk_Users zu
                             WHERE LTRIM(RTRIM(zu.dni)) IN (d.doc, d.doc8))))
                  AND CAST(SWITCHOFFSET(t.PunchTime, '-05:00') AS DATE) >= CAST(u.fecha_desde AS DATE)
                  AND (u.fecha_hasta IS NULL
                       OR CAST(SWITCHOFFSET(t.PunchTime, '-05:00') AS DATE) <= CAST(u.fecha_hasta AS DATE))
                GROUP BY CAST(SWITCHOFFSET(t.PunchTime, '-05:00') AS DATE)
                ) x
               ) AS fechas_asistidas,
               -- foto del colaborador: la última imagen subida (como en su perfil)
               (SELECT TOP (1) i.name_image FROM dbo.tb_image i
                WHERE i.uid_location = e.uid_avatar ORDER BY i.id DESC) AS avatar
        FROM ultimo u
        JOIN dbo.tb_empleados e ON e.uid = u.uid_empleado AND e.flag = 1
        WHERE u.n = 1
        ORDER BY e.estado_empl DESC, e.nombre_empl ASC
      `);

    // Horario de cada contrato (1 semana, o 2 si es intersemana)
    const uidsJornada = [...new Set(result.recordset.map((c) => c.uid_jornada).filter(Boolean))];
    const jornadas = uidsJornada.length
      ? await Jornada.findAll({
          where: { uid_jornada: uidsJornada },
          order: [["semana", "ASC"]],
          raw: true,
        })
      : [];
    const ayer = fechaHoraLima(new Date(Date.now() - 86400000)).fecha;
    const hoy = fechaHoraLima(new Date()).fecha;
    const aMinutos = (hora) => {
      const [h, m] = hora.split(":").map(Number);
      return h * 60 + m;
    };

    const colaboradores = result.recordset.map(({ fechas_asistidas, ...c }) => {
      // fecha -> hora de la primera marcación ("HH:mm")
      const primeraMarcacion = new Map(
        (fechas_asistidas ? fechas_asistidas.split(",") : []).map((d) => d.split(" "))
      );
      const desde = new Date(c.fecha_desde).toISOString().slice(0, 10);
      const finContrato = c.fecha_hasta ? new Date(c.fecha_hasta).toISOString().slice(0, 10) : null;
      const hasta = finContrato && finContrato < hoy ? finContrato : hoy;
      const semanasJornada = jornadas.filter((j) => j.uid_jornada === c.uid_jornada);
      if (semanasJornada.length === 0) {
        return {
          ...c,
          dias_asistidos: primeraMarcacion.size,
          dias_laborables: null,
          dias_no_asistio: null,
          minutos_tardanza: null,
          dias_tardanza: null,
        };
      }
      const laborables = diasLaborables(desde, hasta, semanasJornada);
      // faltas hasta ayer: hoy aún puede marcar
      const laborablesHastaAyer = laborables.filter((d) => d.fecha <= ayer);
      const tardanzas = laborables
        .filter((d) => primeraMarcacion.has(d.fecha))
        .map((d) => aMinutos(primeraMarcacion.get(d.fecha)) - aMinutos(d.entrada))
        .filter((minutos) => minutos > 0);
      return {
        ...c,
        dias_asistidos: primeraMarcacion.size,
        dias_laborables: laborablesHastaAyer.length,
        dias_no_asistio: laborablesHastaAyer.filter((d) => !primeraMarcacion.has(d.fecha)).length,
        minutos_tardanza: tardanzas.reduce((total, minutos) => total + minutos, 0),
        dias_tardanza: tardanzas.length,
      };
    });
    res.status(200).json(colaboradores);
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
  obtenerColaboradoresConContrato,
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
