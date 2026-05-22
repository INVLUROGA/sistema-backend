const { Router } = require("express");
const { extraerUpload } = require("../middlewares/extraerComentarios");
const { obtenerCambioPrograma, postCambioPrograma } = require("../controller/cambioPrograma.controller");
const router = Router();
/**
 * /api/cambio-programa
 */

router.get("/", obtenerCambioPrograma)
router.get("/cli/:idcli", obtenerCambioPrograma)
router.post("/", postCambioPrograma)
// router.post("")
module.exports = router;
