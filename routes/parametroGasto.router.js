const { Router, Route } = require("express");
const router = Router();
const {
  getParametroGasto,
  postActualizarParametroGasto,
  postRegistrarParametroGasto,
  postEliminarParametroGasto,
} = require("../controller/parametroGastoController");

router.get("/gasto-por-cargo", getParametroGasto);
router.put("/actualizar-parametro-gasto", postActualizarParametroGasto);
router.post("/registrar-parametro-gasto", postRegistrarParametroGasto);
router.put("/eliminar-parametro-gasto/:id", postEliminarParametroGasto);

module.exports = router;
