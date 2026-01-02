const { Router } = require("express");
const {
  postProducto,
  getProducto,
  getProductosxEmpresa,
  updateProducto,
  deleteProducto,
  obtenerSeleccionableActivos
} = require("../controller/producto.controller");
const { validarJWT } = require("../middlewares/validarJWT");
const router = Router();

/**
 * /api/producto
 */
router.post("/:id_empresa", postProducto);
router.get("/id/:id", getProducto);
router.get("/empresa/:id_empresa", getProductosxEmpresa);
router.put("/id/:id", updateProducto);
router.put("/delete/id/:id", deleteProducto);
router.get('/combo-activos/:id_empresa', obtenerSeleccionableActivos)
module.exports = router;
