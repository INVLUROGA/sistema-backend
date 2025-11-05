const { Router, Route } = require("express");

const {
  GastoPorCargo,
  ClienteAuth,
  postPlanillaxEmpl,
  obtenerAsistenciasxEmpl,
  obtenerPlanillaxID,
  obtenerPlanillasxEmpl,
  postContratosEmpl,
} = require("../controller/recursosHumano");
const {
  obtenerAsistenciaPorEmpl,
} = require("../controller/marcacion.controller");
const {
  obtenerDiasLaborablesxFechaxEmpresa,
} = require("../controller/jornada.controller");

const router = Router();

router.post("/contratos/:uid_empl", postContratosEmpl);

router.get("/gasto-por-cargo", GastoPorCargo);
router.get("/clienteAuth", ClienteAuth);

router.post(`/post-planilla/:uid_empleado`, postPlanillaxEmpl);
router.get(
  "/obtener-asistencias/:uid_empleado/:id_planilla",
  obtenerAsistenciasxEmpl
);
router.get("/get-planillas/:uid_empl", obtenerPlanillasxEmpl);

router.get("/obtener-planilla/:id_planilla", obtenerPlanillaxID);
router.get("/obtener-planilla/:id_planilla", obtenerPlanillaxID);

router.get(
  "/dias-laborables/:id_empresa/:arrayFecha",
  obtenerDiasLaborablesxFechaxEmpresa
);
// GESTION DE FERIADOS

router.get("/licencias-trabajo");

module.exports = router;
