const { Router, Route } = require("express");
const router = Router();
const { getParametroGasto, postActualizarParametroGasto, postRegistrarParametroGasto, postEliminarParametroGasto } = require("../controller/parametroGastoController");

router.get("/gasto-por-cargo",getParametroGasto);
router.post("/actualizar-parametro-gasto",postActualizarParametroGasto);
router.post("/registrar-parametro-gasto",postRegistrarParametroGasto);
router.post("/eliminar-parametro-gasto",postEliminarParametroGasto);

module.exports = router;