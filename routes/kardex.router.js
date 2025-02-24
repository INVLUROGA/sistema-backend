const { Router } = require("express");
const { validarJWT } = require("../middlewares/validarJWT");
const {
    obtenerKardexSalidas,
  obtenerItemKardex,
  postKardexxAccion,
  obtenerKardexEntrada,
} = require("../controller/kardex.controller");
const router = Router();


/**
 * /api/kardex
 */
router.get("/inventario/obtener-kardex-entrada/:id_empresa", obtenerKardexEntrada);
router.get("/inventario/obtener-kardex-salidas/:id_empresa", obtenerKardexSalidas);
router.get("/inventario/obtener-item/:id", obtenerItemKardex);
router.post("/inventario/post-kardex-entrada/:id_empresa", postKardexxAccion);
router.post("/inventario/post-kardex-salida/:id_empresa", postKardexxAccion);
module.exports = router;
