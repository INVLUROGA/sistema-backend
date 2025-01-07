const { Router } = require("express");
const {
  obtenerAsistenciaDeClientes,
  obtenerAsistenciaPorClientes,
  obtenerAsistenciaPorEmpl,
} = require("../controller/marcacion.controller");
const { validarJWT } = require("../middlewares/validarJWT");
const router = Router();

router.get("/obtener-asistencia-clientes", obtenerAsistenciaDeClientes);

router.get(
  "/obtener-asistencia-clientes-por-cliente",
  obtenerAsistenciaPorClientes
);
router.get("/obtener-asistencias-x-empleado", obtenerAsistenciaPorEmpl);

module.exports = router;
