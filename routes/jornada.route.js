const { Router } = require("express");

const {
  postJornada,
  obtenerJornadas,
  obtenerJornadaxEmpl,
  postContratoJornadaEmpleado,
  obtenerContratosxEmpleado,
  postDiasLaborables,
  obtenerContratosxFecha,
  obtenerDiasLaborablesxIdContrato,
} = require("../controller/jornada.controller");
const router = Router();
/**
 * [API Documentation]
 * /api/jornada
 */

router.post("/post-jornada/:id_enterprice", postJornada);
router.get("/obtener-jornadas/:id_enterprice", obtenerJornadas);

router.get("/obtener-jornada-x-empl/:uid_empl", obtenerJornadaxEmpl);

router.get("/obtener-contratos", obtenerContratosxFecha);

router.post("/jornada/:id_empl", postContratoJornadaEmpleado);
router.get("/jornada/:id_empl", obtenerContratosxEmpleado);
router.post("/diaxcontrato", postDiasLaborables);
router.get(
  `/dias-laborables/idContrato/:idContrato`,
  obtenerDiasLaborablesxIdContrato
);

module.exports = router;
