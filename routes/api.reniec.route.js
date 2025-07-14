const { Router } = require("express");
const {
  obtenerDatosReniec,
} = require("../controller/api.reniec.controller.js");

const router = Router();
/**
 * [API Documentation]
 * /api/apireniec
 */
router.post("/busqueda", obtenerDatosReniec);

module.exports = router;
