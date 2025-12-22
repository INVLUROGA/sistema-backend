const { Router } = require("express");
const {
  postIngreso,
  getIngresos,
  getIngresoPorID,
  deleteIngresoxID,
  putIngresoxID,
  getIngresosxFechaxEmpresa,
} = require("../controller/ingreso.controller");
const router = Router();
/*
/api/ingreso
*/
//
router.get("/get-ingreso/:id", getIngresoPorID);
router.post("/", postIngreso);
router.get("/:id_empresa", getIngresos);
router.put("/id/:id", putIngresoxID);
router.put("/delete/id/:id", deleteIngresoxID);
router.get("/fecha/:id_empresa", getIngresosxFechaxEmpresa);
module.exports = router;
