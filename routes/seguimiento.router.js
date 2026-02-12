const { Router } = require("express");
const {
  getSeguimientos,
  obtenerSeguimientosxIdCli,
  getSeguimientoxFechaVencimientos,
} = require("../controller/seguimiento.controller");
const router = Router();

/**
 * /api/seguimiento
 */

router.get("/", getSeguimientos);
router.get('/rango-fecha-vencimiento', getSeguimientoxFechaVencimientos)
router.get("/id_cli/:id_cli", obtenerSeguimientosxIdCli);

module.exports = router;
