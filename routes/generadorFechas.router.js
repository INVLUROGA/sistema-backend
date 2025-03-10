const { Router } = require("express");
const {
  postGenerarFechas,
  getFechasxEntidadxEmpresa,
  removeFechasxId
} = require("../controller/generadorFechas.controller");
const router = Router();

//TODO: /api/generador-fechas

router.get("/get-fechas/:entidad/:id_empresa", getFechasxEntidadxEmpresa);
router.put("/remove-fechas/:id", removeFechasxId);
router.post("/post-generador-fechas/:entidad/:id_empresa", postGenerarFechas);

// router.get("/get-extension-mem/:idVenta", obtenerExtension)

// router.put("/update-extension/:id", putExtension);
// router.put("/remove-extension/:id", removeExtension);

module.exports = router;
