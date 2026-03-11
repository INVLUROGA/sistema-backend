const { Router } = require("express");
const {
  obtenerContratosxEmpleado,
  postContratos,
  putContratosxID,
} = require("../controller/contratoEmpleado.controller");
const router = Router();
/*
/api/contrato-empleado
*/
router.post("/id_empl/:id_empl", postContratos);
router.put("/id/:id", putContratosxID);
router.get("/id_empl/:id_empl", obtenerContratosxEmpleado);
module.exports = router;
