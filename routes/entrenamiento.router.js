const { Router } = require("express");
const {
    getEntrenamientos,
    createEntrenamiento,
    updateEntrenamiento,
    getTiposEjercicio,
    createTipoEjercicio,
} = require("../controller/entrenamiento/catalogo.controller");

const {
    getHistorialByCliente,
    saveHistorial,
    updateHistorial,
    getHistorialGlobal,
    getHistorialEvolutivo,
} = require("../controller/entrenamiento/historial.controller");

const {
    getTurnos,
    createTurno,
    updateTurno,
} = require("../controller/entrenamiento/turno.controller");

const {
    getAsistenciaPorPlan,
    obtenerAsistenciasConPlan,
    asignarPlan,
    registrarAsistencia,
} = require("../controller/entrenamiento/asistencia.controller");

const {
    getClientesFs45,
    getMembresiasActivas,
    getVentasCliente,
} = require("../controller/entrenamiento/membresia.controller");

const { saveResultados } = require("../controller/resultados.controller");

const router = Router();

// /api/entrenamiento

// Catálogo
router.get("/catalogo", getEntrenamientos);
router.post("/catalogo", createEntrenamiento);
router.put("/catalogo/:id", updateEntrenamiento);

// Tipos de ejercicio
router.get("/tipos-ejercicio", getTiposEjercicio);
router.post("/tipos-ejercicio", createTipoEjercicio);

// Clientes FS45
router.get("/clientes-fs45", getClientesFs45);

// Historial
router.get("/historial-global", getHistorialGlobal);
router.get("/historial/:id_cliente", getHistorialByCliente);
router.post("/historial", saveHistorial);
router.put("/historial/:id", updateHistorial);

// Resultados Reto
router.post("/resultados", saveResultados);
router.get("/historial-evolutivo/:id_cliente", getHistorialEvolutivo);

// Turnos Gimnasio
router.get("/turnos", getTurnos);
router.post("/turnos", createTurno);
router.put("/turnos/:id", updateTurno);

// Asistencia
router.get("/asistencia/:id_venta", getAsistenciaPorPlan);
router.post("/registrar-asistencia", registrarAsistencia);
router.get("/asistencias-con-plan", obtenerAsistenciasConPlan);
router.post("/asignar-plan", asignarPlan);

// Ventas y Membresías del cliente
router.get("/ventas/:id_cliente", getVentasCliente);
router.get("/membresias-activas/:id_cliente", getMembresiasActivas);

module.exports = router;
