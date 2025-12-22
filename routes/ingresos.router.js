const { Router } = require("express");
const {
  postIngreso,
  getIngresosxEmpresa,
  getIngresoPorID,
  deleteIngresoxID,
  putIngresoxID,
  getIngresosxFechaxEmpresa,
} = require("../controller/ingreso.controller");
const router = Router();
/*
/api/ingreso
*/
router.get("/id/:id", getIngresoPorID);
router.post("/", postIngreso);
router.get("/:id_empresa", getIngresosxEmpresa);
router.put("/id/:id", putIngresoxID);
router.put("/delete/id/:id", deleteIngresoxID);
router.get("/fecha/:id_empresa", getIngresosxFechaxEmpresa);
module.exports = router;
