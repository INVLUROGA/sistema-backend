const { Router } = require("express");
const {
  obtenerInventario,
  registrarArticulo,
  actualizarArticulo,
  eliminarArticulo,
  obtenerArticuloxID,
  obtenerParametrosLugares,
} = require("../controller/inventario.controller");
const { validarJWT } = require("../middlewares/validarJWT");
const router = Router();
/*
/api/inventario
*/
router.get("/obtener-inventario/:id_enterprice", obtenerInventario);
router.post(`/post-articulo/:id_enterprice`, registrarArticulo);
router.put("/remove-articulo/:id", eliminarArticulo);
router.put("/update-articulo/:id", actualizarArticulo);
router.get("/obtener-articulo/:id", obtenerArticuloxID);

router.get("/parametros-lugares", obtenerParametrosLugares);

// router.get("/parametros-articulos/:id_empresa", obtenerArticulos)


module.exports = router;
