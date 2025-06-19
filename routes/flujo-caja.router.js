const { Router } = require("express");
const {
  getIngresosxMESandAnio,
  getGastoxGrupo,
  getCreditoFiscal,
} = require("../controller/flujo-caja.controller");
const router = Router();
/**
 *
 * /api/flujo-caja
 */

router.get("/ingresos", getIngresosxMESandAnio);

router.get("/get-gasto-x-grupo/:id_enterp/:anio", getGastoxGrupo);
router.get("/credito-fiscal/:id_enterp", getCreditoFiscal);
module.exports = router;
