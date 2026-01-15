const { Router } = require("express");
const {
  getSeguimientos,
  obtenerSeguimientosxIdCli,
} = require("../controller/seguimiento.controller");
const router = Router();

/**
 * /api/seguimiento
 */

router.get("/", getSeguimientos);

router.get("/id_cli/:id_cli", obtenerSeguimientosxIdCli);

module.exports = router;
