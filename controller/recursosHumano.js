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
      grupo,
      id_gasto,
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
      grupo,
      id_gasto,
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

const aMinutos = (hora) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};
const aFecha = (fecha) => new Date(fecha).toISOString().slice(0, 10);
const ENTIDADES_TIEMPOS_ESPECIALES = ["permiso", "tardanza", "hora-extra", "salida-temprana"];

// Faltas y tardanzas del periodo, aplicando los registros de perfil-colaborador > Recursos Humanos:
// - permiso: en los días de su rango la tardanza es 0, con o sin goce. Además, con goce esos días no son falta.
// - tardanza sin goce: si ese día tenía horario y marcó, sus minutos reemplazan a los calculados con el huellero
//   y se descuentan del sueldo (una falta ya descuenta el día completo; el permiso tiene prioridad).
// - tardanza con goce: sus minutos se restan de la tardanza de ese día.
// - salida temprana sin goce: sus minutos se devuelven para descontarlos, solo si ese día tenía horario y
//   marcó (una falta ya descuenta el día completo). Con goce: no se descuenta.
function calcularAsistencia({ laborables, ayer, primeraMarcacion, tiempos }) {
  const conGoce = (entidad) => tiempos.filter((t) => t.entidad === entidad && t.conGoceSueldo);
  const enRango = (registros, fecha) =>
    registros.some((t) => fecha >= aFecha(t.fechaDesde) && fecha <= aFecha(t.fechaHasta));
  const permisos = tiempos.filter((t) => t.entidad === "permiso");
  const permisosConGoce = conGoce("permiso");
  const sumarMinutos = (registros, fecha) =>
    registros
      .filter((t) => aFecha(t.fechaDesde) === fecha)
      .reduce((total, t) => total + (Number(t.minutos) || 0), 0);

  // faltas hasta ayer: hoy aún puede marcar
  const laborablesHastaAyer = laborables.filter((d) => d.fecha <= ayer);
  const faltas = laborablesHastaAyer.filter((d) => !primeraMarcacion.has(d.fecha));
  const dias_no_asistio = faltas.filter((d) => !enRango(permisosConGoce, d.fecha)).length;

  const tardanzasConGoce = conGoce("tardanza");
  const tardanzasSinGoce = tiempos.filter((t) => t.entidad === "tardanza" && !t.conGoceSueldo);
  let minutos_tardanza = 0;
  let dias_tardanza = 0;
  let minutos_tardanza_justificados = 0;
  laborables
    .filter((d) => primeraMarcacion.has(d.fecha) && !enRango(permisos, d.fecha))
    .forEach((d) => {
      const registrados = sumarMinutos(tardanzasSinGoce, d.fecha);
      const tarde = registrados > 0
        ? registrados
        : aMinutos(primeraMarcacion.get(d.fecha)) - aMinutos(d.entrada);
      if (tarde <= 0) return;
      const justificados = Math.min(tarde, sumarMinutos(tardanzasConGoce, d.fecha));
      minutos_tardanza_justificados += justificados;
      minutos_tardanza += tarde - justificados;
      if (tarde > justificados) dias_tardanza++;
    });

  const salidasSinGoce = tiempos.filter((t) => t.entidad === "salida-temprana" && !t.conGoceSueldo);
  const minutos_salida_sin_goce = laborables
    .filter((d) => primeraMarcacion.has(d.fecha))
    .reduce((total, d) => total + sumarMinutos(salidasSinGoce, d.fecha), 0);

  return {
    dias_laborables: laborablesHastaAyer.length,
    dias_no_asistio,
    dias_permiso_goce: faltas.length - dias_no_asistio,
    minutos_tardanza,
    dias_tardanza,
    minutos_tardanza_justificados,
    minutos_salida_sin_goce,
  };
}

// Colaboradores con contrato (planilla): el contrato más reciente de cada uno.
// estado_empl indica si el colaborador sigue activo; semanas_jornada = 0 si no tiene jornada,
// 2 si es intersemana. El cargo (cargo_empl) se traduce en el frontend.
// dias_no_asistio: días con horario (editar jornada) sin marcación, desde que inició el contrato
// hasta ayer (hoy aún puede marcar) o hasta fecha_hasta. null si el contrato no tiene horario.
// minutos_tardanza: en los días asistidos con horario (hasta hoy), primera marcación - hora de entrada,
// en minutos completos, como el reporte de asistencia. null si el contrato no tiene horario.
// Con ?mes=1..12&anio=YYYY (opcionales, van juntos): el contrato más reciente que estuvo vigente en ese mes,
// y las marcaciones, faltas y tardanzas se cuentan solo dentro de ese mes.
const obtenerColaboradoresConContrato = async (req = request, res = response) => {
  try {
    const { id_enterprice } = req.params;
    const { mes, anio } = req.query;
    let inicioMes = null;
    let finMes = null;
    if (mes !== undefined || anio !== undefined) {
      const mesNum = Number(mes);
      const anioNum = Number(anio);
      if (!Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12 || !Number.isInteger(anioNum) || anioNum < 2000 || anioNum > 2100) {
        return res.status(400).json({ error: "mes y anio deben enviarse juntos: mes de 1 a 12 y anio válido" });
      }
      inicioMes = `${anioNum}-${String(mesNum).padStart(2, "0")}-01`;
      finMes = new Date(Date.UTC(anioNum, mesNum, 0)).toISOString().slice(0, 10);
    }
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("id_enterprice", sql.Int, id_enterprice)
      .input("inicio_mes", sql.VarChar(10), inicioMes)
      .input("fin_mes", sql.VarChar(10), finMes)
      .query(`
        WITH ultimo AS (
          SELECT p.*,
                 ROW_NUMBER() OVER (PARTITION BY p.uid_empleado ORDER BY p.fecha_desde DESC, p.id DESC) AS n,
                 COUNT(*) OVER (PARTITION BY p.uid_empleado) AS cantidad_contratos
          FROM dbo.jornada_planillas p
          WHERE p.flag = 1 AND p.id_enterprice = @id_enterprice
            AND (@fin_mes IS NULL OR CAST(p.fecha_desde AS DATE) <= CAST(@fin_mes AS DATE))
            AND (@inicio_mes IS NULL OR p.fecha_hasta IS NULL OR CAST(p.fecha_hasta AS DATE) >= CAST(@inicio_mes AS DATE))
        )
        SELECT u.id, u.uid_empleado, u.fecha_desde, u.fecha_hasta, u.uid_jornada, u.sueldo, u.tipo_pago,
               u.tipo_jornada, u.fecha_pago, u.observacion, u.cantidad_contratos,
               u.id_gasto, g.nombre_gasto AS concepto,
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
                  AND (@inicio_mes IS NULL OR CAST(SWITCHOFFSET(t.PunchTime, '-05:00') AS DATE) >= CAST(@inicio_mes AS DATE))
                  AND (@fin_mes IS NULL OR CAST(SWITCHOFFSET(t.PunchTime, '-05:00') AS DATE) <= CAST(@fin_mes AS DATE))
                GROUP BY CAST(SWITCHOFFSET(t.PunchTime, '-05:00') AS DATE)
                ) x
               ) AS fechas_asistidas,
               -- foto del colaborador: la última imagen subida (como en su perfil)
               (SELECT TOP (1) i.name_image FROM dbo.tb_image i
                WHERE i.uid_location = e.uid_avatar ORDER BY i.id DESC) AS avatar
        FROM ultimo u
        JOIN dbo.tb_empleados e ON e.uid = u.uid_empleado AND e.flag = 1
        LEFT JOIN dbo.tb_parametros_gastos g ON g.id = u.id_gasto
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
    const idsColaboradores = [...new Set(result.recordset.map((c) => c.id_empl))];
    const tiemposEspeciales = idsColaboradores.length
      ? await TiemposEspeciales.findAll({
          where: {
            flag: true,
            entidad: ENTIDADES_TIEMPOS_ESPECIALES,
            id_colaborador: idsColaboradores,
          },
          raw: true,
        })
      : [];

    const colaboradores = result.recordset.map(({ fechas_asistidas, ...c }) => {
      // fecha -> hora de la primera marcación ("HH:mm")
      const primeraMarcacion = new Map(
        (fechas_asistidas ? fechas_asistidas.split(",") : []).map((d) => d.split(" "))
      );
      const desde = new Date(c.fecha_desde).toISOString().slice(0, 10);
      const finContrato = c.fecha_hasta ? new Date(c.fecha_hasta).toISOString().slice(0, 10) : null;
      const hasta = [finContrato, hoy, finMes].filter(Boolean).sort()[0];
      const semanasJornada = jornadas.filter((j) => j.uid_jornada === c.uid_jornada);
      const tiempos = tiemposEspeciales.filter((t) => t.id_colaborador === c.id_empl);
      // horas extras del periodo: no dependen del horario (pueden ser en un día libre o feriado)
      const inicioPeriodo = inicioMes && inicioMes > desde ? inicioMes : desde;
      const minutos_extra = tiempos
        .filter((t) => t.entidad === "hora-extra")
        .filter((t) => aFecha(t.fechaDesde) >= inicioPeriodo && aFecha(t.fechaDesde) <= hasta)
        .reduce((total, t) => total + (Number(t.minutos) || 0), 0);
      // rangos de permisos, para que el reporte de asistencia (VER) muestre lo mismo que la planilla
      const permisos = tiempos
        .filter((t) => t.entidad === "permiso")
        .map((t) => ({
          desde: aFecha(t.fechaDesde),
          hasta: aFecha(t.fechaHasta),
          conGoceSueldo: Boolean(t.conGoceSueldo),
        }));
      const tardanzas_registradas = tiempos
        .filter((t) => t.entidad === "tardanza")
        .map((t) => ({
          fecha: aFecha(t.fechaDesde),
          minutos: Number(t.minutos) || 0,
          conGoceSueldo: Boolean(t.conGoceSueldo),
        }));
      if (semanasJornada.length === 0) {
        return {
          ...c,
          dias_asistidos: primeraMarcacion.size,
          dias_laborables: null,
          dias_no_asistio: null,
          dias_permiso_goce: null,
          minutos_tardanza: null,
          dias_tardanza: null,
          minutos_tardanza_justificados: null,
          minutos_salida_sin_goce: null,
          minutos_extra,
          permisos,
          tardanzas_registradas,
        };
      }
      // el ciclo de semanas siempre se cuenta desde el inicio del contrato; luego se recorta al mes
      const laborables = diasLaborables(desde, hasta, semanasJornada).filter(
        (d) => !inicioMes || d.fecha >= inicioMes
      );
      return {
        ...c,
        dias_asistidos: primeraMarcacion.size,
        minutos_extra,
        permisos,
        tardanzas_registradas,
        ...calcularAsistencia({ laborables, ayer, primeraMarcacion, tiempos }),
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
    const { id_colaborador } = req.query;
    const where = { flag: true, entidad, id_empresa };
    // ?id_colaborador= (opcional): solo los registros de ese colaborador
    if (id_colaborador !== undefined) {
      if (!Number.isInteger(Number(id_colaborador))) {
        return res.status(400).json({ msg: "id_colaborador no es válido" });
      }
      where.id_colaborador = Number(id_colaborador);
    }
    const tiempoEspeciales = await TiemposEspeciales.findAll({ where });
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

// FLUJO DE CAJA: todos los contratos (planillas) de los colaboradores activos, con su
// "fecha desde"/"fecha hasta" y el concepto (id_gasto). El front decide mes a mes
// cuál contrato está vigente para cada persona.
const obtenerSueldosxConceptoFlujoCaja = async (req = request, res = response) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT u.id, u.uid_empleado, u.sueldo, u.tipo_pago, u.grupo, u.id_gasto,
             u.fecha_desde, u.fecha_hasta, u.id_enterprice,
             e.nombre_empl, e.apPaterno_empl, e.apMaterno_empl, e.cargo_empl
      FROM dbo.jornada_planillas u
      JOIN dbo.tb_empleados e ON e.uid = u.uid_empleado AND e.flag = 1 AND e.estado_empl = 1
      WHERE u.flag = 1 AND u.fecha_desde IS NOT NULL
    `);
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({
      error: error.message,
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
  obtenerSueldosxConceptoFlujoCaja,
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
