const { Router } = require("express");
const {
  obtenerEventosAsistencia,
  obtenerEstadoHuelleros,
  obtenerPersonas,
  agregarPersona,
  eliminarHuella,
  eliminarPersona,
  sincronizarHuelleros,
  reenviarPersona,
  agregarHuella,
  obtenerPinesConHuella,
  obtenerReporteAsistencia,
  cambiarEstadoPersona,
} = require("../controller/eventosAsistencia.controller");
const router = Router();
/**
 * /api/eventos-asistencia
 */
router.get("/", obtenerEventosAsistencia);
router.get("/huelleros", obtenerEstadoHuelleros);
router.get("/reporte", obtenerReporteAsistencia);
router.get("/personas", obtenerPersonas);
router.get("/personas/con-huella", obtenerPinesConHuella);
router.post("/personas", agregarPersona);
router.delete("/personas/:pin/huellas/:dedo", eliminarHuella);
router.delete("/personas/:pin", eliminarPersona);
router.post("/sincronizar", sincronizarHuelleros);
router.post("/personas/:pin/reenviar", reenviarPersona);
router.post("/personas/:pin/huellas", agregarHuella);
router.put("/personas/:pin/estado", cambiarEstadoPersona);

module.exports = router;
