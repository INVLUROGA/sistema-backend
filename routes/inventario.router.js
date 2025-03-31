const { Router } = require("express");
const {
  obtenerInventario,
  registrarArticulo,
  actualizarArticulo,
  eliminarArticulo,
  obtenerArticuloxID,
  obtenerParametrosLugares,
  obtenerInventarioxFechas,
  postKardexEntraSale,
  eliminarEntraSale,
  obtenerKardex,
  getInventarioxKardexxFechasxEmpresa,
  postFechaReportKardex,
  removeFechaReportKardex,
  obtenerFechaReportKardex,

} = require("../controller/inventario.controller");
const { validarJWT } = require("../middlewares/validarJWT");
const router = Router();
/*
/api/inventario
*/

router.get(
  "/obtener-inventario-y-kardex-x-fechas/:id_empresa",
  getInventarioxKardexxFechasxEmpresa
);
router.get("/obtener-inventario/:id_enterprice/:flag", obtenerInventario);
router.post(`/post-articulo/:id_enterprice`, registrarArticulo);
router.put("/remove-articulo/:id", eliminarArticulo);
router.put("/update-articulo/:id", actualizarArticulo);
router.get("/obtener-articulo/:id", obtenerArticuloxID);

router.get("/parametros-lugares", obtenerParametrosLugares);

router.get(
  "/obtener-inventario-x-fecha/:id_enterprice",
  obtenerInventarioxFechas
);
router.post("/post-kardex/:action/:id_enterprice", postKardexEntraSale);
router.get("/obtener-kardex/:action/:id_enterprice", obtenerKardex);
router.post("/remove-kardex/:id", eliminarEntraSale);

router.post("/fechas-reporte-kardex/post", eliminarEntraSale);
router.post("/fechas-reporte-kardex/remove", eliminarEntraSale);
router.get("/fechas-reporte-kardex", eliminarEntraSale);


router.post("/post-kardex-transferencia/:action/:id_enterprice", postKardexEntraSale);
router.get("/obtener-kardex-transferencia/:action/:id_enterprice", obtenerKardex);
router.post("/remove-kardex-transferencia/:id", eliminarEntraSale);
// router.get("/parametros-articulos/:id_empresa", obtenerArticulos)

module.exports = router;
