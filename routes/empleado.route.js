const { Router } = require("express");
const {
  obtenerEmpleadosxDepartamento,
  postEmpleado,
  updateEmpleadoxID,
  deleteEmpleadoxID,
  obtenerEmpleadoxID,
  obtenerEmpleadosxEstadoxEmpresa,
} = require("../controller/empleado.controller");
const router = Router();
/*
/api/empleado
*/

router.get(
  "/departamento/:departamento_empl/id_empresa/:id_empresa",
  obtenerEmpleadosxDepartamento,
);
router.get(
  `/id_estado/:id_estado/id_empresa/:id_empresa`,
  obtenerEmpleadosxEstadoxEmpresa,
);
router.post("/", postEmpleado);
router.put("/id/:id", updateEmpleadoxID);
router.put("/delete/id/:id", deleteEmpleadoxID);
router.get("/id/:id", obtenerEmpleadoxID);
module.exports = router;
