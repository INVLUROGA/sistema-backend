const { Router } = require("express");

const {
  obtenerFlujoCajaxFecha,
} = require("../controller/flujo-caja.controller.js");
const router = Router();
/**
 * [API Documentation]
 * /api/flujo-caja
 */

router.get("/fecha-comprobante/:id_empresa", obtenerFlujoCajaxFecha);
module.exports = router;
