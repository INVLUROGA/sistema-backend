const { Router } = require("express");
const {
  obtenerEmpleadosxDepartamento,
} = require("../controller/empleado.controller");
const router = Router();
/*
/api/empleado
*/

router.get(
  "/departamento/:departamento_empl/id_empresa/:id_empresa",
  obtenerEmpleadosxDepartamento,
);

module.exports = router;
