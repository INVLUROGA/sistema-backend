const { request, response } = require("express");
const transactionService = require("../services/transactionService");
const deviceService = require("../services/deviceService");
const personaHuelleroService = require("../services/personaHuelleroService");
const accUserService = require("../services/accUserService");
const commandService = require("../services/commandService");

const MAX_DIAS_RANGO = 93;
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Hoy en Perú (YYYY-MM-DD)
const hoyLima = () => transactionService.fechaHoraLima(new Date()).fecha;

const esFechaValida = (fecha) =>
  FORMATO_FECHA.test(fecha) && !isNaN(new Date(`${fecha}T00:00:00-05:00`).getTime());

/**
 * GET /api/eventos-asistencia?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 * Marcaciones de los huelleros ZKTeco (por defecto, las de hoy).
 */
const obtenerEventosAsistencia = async (req = request, res = response) => {
  const desde = req.query.desde || hoyLima();
  const hasta = req.query.hasta || desde;
  try {
    if (!esFechaValida(desde) || !esFechaValida(hasta)) {
      return res.status(400).json({ ok: false, msg: "Las fechas deben tener el formato YYYY-MM-DD" });
    }
    if (desde > hasta) {
      return res.status(400).json({ ok: false, msg: "La fecha 'desde' no puede ser mayor que 'hasta'" });
    }
    const dias = (new Date(hasta) - new Date(desde)) / 86400000 + 1;
    if (dias > MAX_DIAS_RANGO) {
      return res.status(400).json({ ok: false, msg: `El rango máximo es de ${MAX_DIAS_RANGO} días` });
    }

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
const obtenerPersonas = async (req = request, res = response) => {
  try {
    const [personas, pendientes, huelleros] = await Promise.all([
      accUserService.listarPersonas(),
      commandService.listarPendientesPorPersona(),
      deviceService.listarDispositivosConEstado(),
    ]);

    const sinPendientes = { pendiente: false, huelleros: [], operaciones: [] };
    const conSincronizacion = personas.map((p) => {
      const pendiente = pendientes.get(p.pin);
      return {
        ...p,
        sincronizacion: pendiente
          ? { pendiente: true, huelleros: pendiente.huelleros, operaciones: pendiente.operaciones }
          : sinPendientes,
      };
    });

    // Personas ya eliminadas de la BD cuyo borrado aún no llegó a algún huellero
    const registradas = new Set(personas.map((p) => p.pin));
    const borradosPendientes = [...pendientes.entries()]
      .filter(([pin, p]) => !registradas.has(pin) && p.esBorrado)
      .map(([pin, p]) => ({ pin, huelleros: p.huelleros, operaciones: p.operaciones }));

    res.status(200).json({
      ok: true,
      personas: conSincronizacion,
      borradosPendientes,
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

module.exports = {
  reenviarPersona,
  sincronizarHuelleros,
  obtenerEventosAsistencia,
  obtenerEstadoHuelleros,
  obtenerPersonas,
  agregarPersona,
  eliminarHuella,
  eliminarPersona,
};
