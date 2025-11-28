const { Router } = require("express");
const { validarJWT } = require("../middlewares/validarJWT");
const {
  obtenerMovimientosxArticulo,
  postMovimientoxArticulo,
  updateMovimientoArticuloxId,
  deleteMovimientoArticuloxId,
} = require("../controller/kardex.controller");
const router = Router();

/**
 * /api/movimiento-articulo
 */
router.get("/id-articulo/:idArticulo/:movimiento", obtenerMovimientosxArticulo);
router.post("/:idArticulo/:movimiento", postMovimientoxArticulo);
router.put("/:id", updateMovimientoArticuloxId);
router.put("/delete/:id", deleteMovimientoArticuloxId);
// router.post("/:idArticulo/:movimiento", obtenerKardexEntrada);
// router.put("/:idArticulo/:movimiento", obtenerKardexEntrada);
// router.put("/delete/:idArticulo/:movimiento", obtenerKardexEntrada);
// router.get(
//   "/inventario/obtener-kardex-salidas/:id_empresa",
//   obtenerKardexSalidas
// );
// router.get("/inventario/obtener-item/:id", obtenerItemKardex);
// router.post("/inventario/post-kardex-entrada/:id_empresa", postKardexxAccion);
// router.post("/inventario/post-kardex-salida/:id_empresa", postKardexxAccion);
module.exports = router;
