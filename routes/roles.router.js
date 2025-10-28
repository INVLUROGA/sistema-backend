const { Router } = require("express");
const router = Router();
const {
  seccionPOST,
  seccionGET,
  moduleGET,
  obtenermoduloxRole,
  rolPOST,
} = require("../controller/roles.controller.js");
const { validarJWT } = require("../middlewares/validarJWT.js");


router.post("/seccion-post", seccionPOST);
router.get("/get-module/:rol", rolPOST);                 // <-- debería ser moduleGET
router.get("/get-section/:modulo", obtenermoduloxRole);  // <-- debería ser seccionGET
router.get("/get-section-x-module/:modulo", seccionGET);
router.get("/get-module-x-rol/:uid", moduleGET);         // <-- probablemente obtenermoduloxRole


// router.get("/get-module/:rol", moduleGET);
module.exports = router;
