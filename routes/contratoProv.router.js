const { Router } = require("express");
const {
  PostContratoProv,
  GetContratoProvxID,
  GetContratoProvs,
  deleteContratoProvxID,
  updateContratoProvxID,
  obtenerComboContratosxIdProv
} = require("../controller/contratoProv.controller");
const { validarJWT } = require("../middlewares/validarJWT");
const router = Router();
// /contrato-prov
router.get('/combo-id-prov/:id_prov', obtenerComboContratosxIdProv)
router.post("/", PostContratoProv);
router.get("/:id_empresa", GetContratoProvs);
router.get("/id/:id", GetContratoProvxID);
router.put("/:id", updateContratoProvxID);
router.put("/delete/:id", deleteContratoProvxID);
module.exports = router;
