const { Router } = require("express");
const {
  obtenerEventosAsistencia,
  obtenerEstadoHuelleros,
  agregarPersona,
} = require("../controller/eventosAsistencia.controller");
const router = Router();
/**
 * /api/eventos-asistencia
 */
router.get("/", obtenerEventosAsistencia);
router.get("/huelleros", obtenerEstadoHuelleros);
router.post("/personas", agregarPersona);

module.exports = router;
