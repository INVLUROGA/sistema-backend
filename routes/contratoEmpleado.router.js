const { Router } = require("express");
const {
  obtenerContratosxEmpleado,
  postContratos,
  putContratosxID,
  deleteContratosxID,
  postSemanasxContrato,
  obtenerSemanasxContrato,
} = require("../controller/contratoEmpleado.controller");
const router = Router();
/*
/api/contrato-empleado
*/
router.post("/id_empl/:id_empl", postContratos);
router.put("/delete/id/:id", deleteContratosxID);
router.get("/id_empl/:id_empl", obtenerContratosxEmpleado);

router.post("/semana", postSemanasxContrato);
router.get("/semana/:id_empresa", obtenerSemanasxContrato);
module.exports = router;
