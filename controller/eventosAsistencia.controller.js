const { request, response } = require("express");
const transactionService = require("../services/transactionService");
const deviceService = require("../services/deviceService");
const personaHuelleroService = require("../services/personaHuelleroService");

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

module.exports = {
  obtenerEventosAsistencia,
  obtenerEstadoHuelleros,
  agregarPersona,
};
