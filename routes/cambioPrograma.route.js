const { Router } = require("express");
const { extraerUpload } = require("../middlewares/extraerComentarios");
const { obtenerCambioPrograma } = require("../controller/cambioPrograma.controller");
const router = Router();
/**
 * /api/cambio-programa
 */

router.get("/obtener-cambios-programa", obtenerCambioPrograma)
// router.post("")
module.exports = router;
