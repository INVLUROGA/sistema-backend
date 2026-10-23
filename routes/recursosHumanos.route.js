const { Router, Route } = require("express");

const {
  postPlanillaxEmpl,
  obtenerAsistenciasxEmpl,
  obtenerPlanillaxID,
  obtenerPlanillasxEmpl,
  updatePlanillaxID,
  deletePlanillaxID,
  obtenerJornadaxPlanilla,
  updateJornadaxPlanilla,
  postContratosEmpl,
  PostTiemposEspeciale,
  updateTiemposEspecialxID,
  GetTiemposEspecialxID,
  deleteTiemposEspecialxID,
  GetTiemposEspeciales,
} = require("../controller/recursosHumano");
const {
  obtenerAsistenciaPorEmpl,
} = require("../controller/marcacion.controller");
const {
  obtenerDiasLaborablesxFechaxEmpresa,
} = require("../controller/jornada.controller");

const router = Router();

router.post("/contratos/:uid_empl", postContratosEmpl);

// router.get("/gasto-por-cargo", GastoPorCargo);
// router.get("/clienteAuth", ClienteAuth);

router.post(`/post-planilla/:uid_empleado`, postPlanillaxEmpl);
router.get(
  "/obtener-asistencias/:uid_empleado/:id_planilla",
  obtenerAsistenciasxEmpl
);
router.get("/get-planillas/:uid_empl", obtenerPlanillasxEmpl);

router.get("/obtener-planilla/:id_planilla", obtenerPlanillaxID);
router.put("/put-planilla/:id_planilla", updatePlanillaxID);
router.put("/delete-planilla/:id_planilla", deletePlanillaxID);
router.get("/jornada-planilla/:id_planilla", obtenerJornadaxPlanilla);
router.put("/jornada-planilla/:id_planilla", updateJornadaxPlanilla);

router.get(
  "/dias-laborables/:id_empresa/:arrayFecha",
  obtenerDiasLaborablesxFechaxEmpresa
);
// GESTION DE FERIADOS

router.get("/tiempos-especiales/:id_empresa/:entidad", GetTiemposEspeciales);
router.post("/tiempos-especiales/:id_empresa/:entidad", PostTiemposEspeciale);
router.put("/tiempos-especiales/:id", updateTiemposEspecialxID);
router.get("/tiempos-especiales/id/:id", GetTiemposEspecialxID);
router.put("/tiempos-especiales/delete/:id", deleteTiemposEspecialxID);

module.exports = router;
