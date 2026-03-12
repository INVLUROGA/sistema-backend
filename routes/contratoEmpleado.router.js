const { Router } = require("express");
const {
  obtenerContratosxEmpleado,
  postContratos,
  putContratosxID,
  deleteContratosxID,
} = require("../controller/contratoEmpleado.controller");
const router = Router();
/*
/api/contrato-empleado
*/
router.post("/id_empl/:id_empl", postContratos);
router.put("/delete/id/:id", deleteContratosxID);
router.get("/id_empl/:id_empl", obtenerContratosxEmpleado);

router.post("/semana/");
module.exports = router;
