const { Router } = require("express");
const {
  getSeguimientos,
  obtenerSeguimientosxUid,
  getSeguimientoxFechaVencimientos,
  getReporteSeguimiento,
} = require("../controller/seguimiento.controller");
const { validarJWT } = require("../middlewares/validarJWT");
const router = Router();

/**
 * /api/seguimiento
 */

router.get("/", getSeguimientos);
router.get("/rango-fecha-vencimiento", getSeguimientoxFechaVencimientos);
// devuelve nombres y DNI: requiere sesion
router.get("/reporte", validarJWT, getReporteSeguimiento);
router.get("/uid/:uid", obtenerSeguimientosxUid);

module.exports = router;
