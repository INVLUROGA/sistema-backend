const { Router } = require("express");
const {
  getSeguimientos,
  obtenerSeguimientosxUid,
  getSeguimientoxFechaVencimientos,
} = require("../controller/seguimiento.controller");
const router = Router();

/**
 * /api/seguimiento
 */

router.get("/", getSeguimientos);
router.get("/rango-fecha-vencimiento", getSeguimientoxFechaVencimientos);
router.get("/uid/:uid", obtenerSeguimientosxUid);

module.exports = router;
