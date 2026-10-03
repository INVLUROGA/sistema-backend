const { request, response } = require("express");
const transactionService = require("../services/transactionService");
const deviceService = require("../services/deviceService");
const personaHuelleroService = require("../services/personaHuelleroService");
const accUserService = require("../services/accUserService");
const commandService = require("../services/commandService");
const reporteAsistenciaService = require("../services/reporteAsistenciaService");

const MAX_DIAS_RANGO = 93;
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Hoy en Perú (YYYY-MM-DD)
const hoyLima = () => transactionService.fechaHoraLima(new Date()).fecha;

const esFechaValida = (fecha) =>
  FORMATO_FECHA.test(fecha) && !isNaN(new Date(`${fecha}T00:00:00-05:00`).getTime());

// Valida un rango de fechas de Perú. Retorna el mensaje de error o null si es válido.
function errorDelRango(desde, hasta) {
  if (!esFechaValida(desde) || !esFechaValida(hasta)) return "Las fechas deben tener el formato YYYY-MM-DD";
  if (desde > hasta) return "La fecha 'desde' no puede ser mayor que 'hasta'";
  const dias = (new Date(hasta) - new Date(desde)) / 86400000 + 1;
  if (dias > MAX_DIAS_RANGO) return `El rango máximo es de ${MAX_DIAS_RANGO} días`;
  return null;
}

/**
 * GET /api/eventos-asistencia?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 * Marcaciones de los huelleros ZKTeco (por defecto, las de hoy).
 */
const obtenerEventosAsistencia = async (req = request, res = response) => {
  const desde = req.query.desde || hoyLima();
  const hasta = req.query.hasta || desde;
  try {
    const error = errorDelRango(desde, hasta);
    if (error) return res.status(400).json({ ok: false, msg: error });

    const eventos = await transactionService.listarMarcaciones(desde, hasta);
    res.status(200).json({ ok: true, desde, hasta, eventos });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: "Hable con el administrador" });
  }
};

/**
 * GET /api/eventos-asistencia/huelleros
 * Estado en línea / fuera de línea de cada huellero.
 */
const obtenerEstadoHuelleros = async (req = request, res = response) => {
  try {
    const huelleros = await deviceService.listarDispositivosConEstado();
    res.status(200).json({
      ok: true,
      minutosOffline: deviceService.obtenerMinutosOffline(),
      huelleros,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: "Hable con el administrador" });
  }
};

/**
 * POST /api/eventos-asistencia/personas
 * Body: { nombre, dni, binaryData (huella en base64), dedo? (0-9, por defecto 0) }
 * Guarda a la persona con su huella y la envía a los huelleros activos.
 */
const agregarPersona = async (req = request, res = response) => {
  try {
    const { status, ...resultado } = await personaHuelleroService.agregarPersona(req.body);
    res.status(status).json(resultado);
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: "Hable con el administrador" });
  }
};

/**
 * GET /api/eventos-asistencia/personas
 * Personas registradas para los huelleros, con los dedos que tienen huella y si tienen
 * cambios pendientes de sincronizar (comandos en la cola que el huellero aún no recogió).
 */
// Estado de sincronización de una persona con los huelleros, combinando:
// - la cola (comandos que el huellero aún no recogió) -> "pendiente"
// - el historial de resultados (zk_CommandLog) -> "esperando" / "error" / "sin_confirmar" / "confirmado"
// Sin cola ni historial (ej. personas importadas del huellero) -> "sincronizado".
// "registrado" (pedido sin marca de entrega) que ya no está en la cola cuenta como "sincronizado":
// el huellero lo recogió de un servidor que aún no registra entregas.
const PRIORIDAD_ESTADO = ["pendiente", "esperando", "error", "sin_confirmar", "confirmado"];
const SEGUNDOS_EN_RECIENTES = 24 * 60 * 60; // borrados visibles en la página durante 24 h
function calcularSincronizacion(pendiente, resultados = []) {
  const estados = new Set(resultados.map((r) => r.estado));
  if (pendiente) estados.add("pendiente");
  const estado = PRIORIDAD_ESTADO.find((e) => estados.has(e)) || "sincronizado";

  const errores = resultados
    .filter((r) => r.estado === "error")
    .map(({ DeviceSN, operacion, dedo, codigo }) => ({ DeviceSN, operacion, dedo, codigo }));
  return {
    estado,
    pendiente: Boolean(pendiente),
    huelleros: pendiente?.huelleros || [],
    operaciones: pendiente?.operaciones || [],
    esperando: resultados
      .filter((r) => r.estado === "esperando")
      .map(({ DeviceSN, operacion }) => ({ DeviceSN, operacion })),
    errores,
    // Por dedo: huellas aún en cola o rechazadas por el huellero
    dedosPendientes: pendiente?.dedos || [],
    dedosConError: [...new Set(errores.filter((e) => e.dedo !== null).map((e) => e.dedo))],
  };
}

// Huellas que se eliminaron de la persona en las últimas 24 h, con el estado del borrado en el
// huellero: [{ dedo, estado }] ("pendiente" mientras la orden siga en la cola).
function huellasEliminadasRecientes(persona, pendiente, resultados = []) {
  const porDedo = new Map();
  for (const r of resultados) {
    if (r.operacion !== "borrado de huella" || r.dedo === null) continue;
    if (persona.dedos.includes(r.dedo)) continue; // se volvió a agregar
    if (r.segundosDesdePedido > SEGUNDOS_EN_RECIENTES) continue;
    porDedo.set(r.dedo, [...(porDedo.get(r.dedo) || []), r]);
  }
  for (const dedo of pendiente?.dedosBorrando || []) {
    if (!persona.dedos.includes(dedo) && !porDedo.has(dedo)) porDedo.set(dedo, []);
  }
  return [...porDedo.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dedo, filas]) => ({
      dedo,
      estado: calcularSincronizacion(pendiente?.dedosBorrando?.includes(dedo) ? pendiente : null, filas).estado,
    }));
}

// Personas eliminadas (ya no están en dbo.zk_Users) en las últimas 24 h o con el borrado aún en
// cola, con el estado del borrado en los huelleros.
function personasEliminadasRecientes(registradas, pendientes, resultados) {
  const pins = new Set();
  for (const [pin, filas] of resultados) {
    if (registradas.has(pin)) continue;
    if (filas.some((r) => r.operacion === "borrado del usuario" && r.segundosDesdePedido <= SEGUNDOS_EN_RECIENTES)) {
      pins.add(pin);
    }
  }
  for (const [pin, p] of pendientes) if (!registradas.has(pin) && p.esBorrado) pins.add(pin);

  return [...pins].map((pin) => {
    const filas = resultados.get(pin) || [];
    return {
      pin,
      nombre: filas.find((r) => r.nombre)?.nombre || null,
      sincronizacion: calcularSincronizacion(pendientes.get(pin), filas),
    };
  });
}

const obtenerPersonas = async (req = request, res = response) => {
  try {
    const [personas, pendientes, resultados, huelleros] = await Promise.all([
      accUserService.listarPersonas(),
      commandService.listarPendientesPorPersona(),
      commandService.listarResultadosPorPersona().catch((error) => {
        // Si la tabla del historial no existe aún, la página sigue funcionando solo con la cola
        console.log("[eventos-asistencia] Sin historial de resultados:", error.message);
        return new Map();
      }),
      deviceService.listarDispositivosConEstado(),
    ]);

    const conSincronizacion = personas.map((p) => ({
      ...p,
      sincronizacion: calcularSincronizacion(pendientes.get(p.pin), resultados.get(p.pin)),
      huellasEliminadas: huellasEliminadasRecientes(p, pendientes.get(p.pin), resultados.get(p.pin)),
    }));

    // Personas ya eliminadas de la BD cuyo borrado aún no llegó a algún huellero
    const registradas = new Set(personas.map((p) => p.pin));
    const borradosPendientes = [...pendientes.entries()]
      .filter(([pin, p]) => !registradas.has(pin) && p.esBorrado)
      .map(([pin, p]) => ({ pin, huelleros: p.huelleros, operaciones: p.operaciones }));

    res.status(200).json({
      ok: true,
      personas: conSincronizacion,
      borradosPendientes,
      eliminadasRecientes: personasEliminadasRecientes(registradas, pendientes, resultados),
      huelleros: huelleros.map((h) => ({ DeviceSN: h.DeviceSN, estado: h.estado })),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: "Hable con el administrador" });
  }
};

/**
 * DELETE /api/eventos-asistencia/personas/:pin/huellas/:dedo
 * Elimina la huella de un dedo en la BD y en los huelleros activos.
 */
const eliminarHuella = async (req = request, res = response) => {
  try {
    const { status, ...resultado } = await personaHuelleroService.eliminarHuella(
      req.params.pin,
      req.params.dedo,
    );
    res.status(status).json(resultado);
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: "Hable con el administrador" });
  }
};

/**
 * DELETE /api/eventos-asistencia/personas/:pin
 * Elimina a la persona y sus huellas en la BD y en los huelleros activos.
 */
const eliminarPersona = async (req = request, res = response) => {
  try {
    const { status, ...resultado } = await personaHuelleroService.eliminarPersona(req.params.pin);
    res.status(status).json(resultado);
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: "Hable con el administrador" });
  }
};

/**
 * POST /api/eventos-asistencia/sincronizar
 * Pide a los huelleros en línea todas sus personas y huellas para importarlas al sistema.
 */
const sincronizarHuelleros = async (req = request, res = response) => {
  try {
    const { status, ...resultado } = await personaHuelleroService.sincronizarDesdeHuelleros();
    res.status(status).json(resultado);
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: "Hable con el administrador" });
  }
};

/**
 * POST /api/eventos-asistencia/personas/:pin/reenviar
 * Sistema -> huellero: reenvía la persona con sus huellas y acceso 24 h a los huelleros activos.
 */
const reenviarPersona = async (req = request, res = response) => {
  try {
    const { status, ...resultado } = await personaHuelleroService.reenviarPersona(req.params.pin);
    res.status(status).json(resultado);
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: "Hable con el administrador" });
  }
};

/**
 * POST /api/eventos-asistencia/personas/:pin/huellas
 * Body: { dedo (0-9), binaryData (huella en base64) }
 * Agrega la huella de otro dedo a la persona y la envía a los huelleros activos.
 */
const agregarHuella = async (req = request, res = response) => {
  try {
    const { status, ...resultado } = await personaHuelleroService.agregarHuella(req.params.pin, req.body || {});
    res.status(status).json(resultado);
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: "Hable con el administrador" });
  }
};

/**
 * GET /api/eventos-asistencia/reporte?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 * Curva de asistencia diaria por programa y tabla unificada por DNI (clientes + huellero).
 * Por defecto, los últimos 30 días.
 */
const obtenerReporteAsistencia = async (req = request, res = response) => {
  const hasta = req.query.hasta || hoyLima();
  let desde = req.query.desde;
  if (!desde && esFechaValida(hasta)) {
    const d = new Date(`${hasta}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 29);
    desde = d.toISOString().slice(0, 10);
  }
  try {
    const error = errorDelRango(desde, hasta);
    if (error) return res.status(400).json({ ok: false, msg: error });

    const reporte = await reporteAsistenciaService.obtenerReporte(desde, hasta);
    res.status(200).json({ ok: true, ...reporte });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: "Hable con el administrador" });
  }
};

module.exports = {
  obtenerReporteAsistencia,
  calcularSincronizacion,
  agregarHuella,
  reenviarPersona,
  sincronizarHuelleros,
  obtenerEventosAsistencia,
  obtenerEstadoHuelleros,
  obtenerPersonas,
  agregarPersona,
  eliminarHuella,
  eliminarPersona,
};
