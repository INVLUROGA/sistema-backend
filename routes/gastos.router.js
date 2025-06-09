  const { Router } = require("express");

const {
  postGasto,
  getGastos,
  getGasto,
  putGasto,
  deleteGasto,
  getGastoxGrupo,
  obtenerOrdenCompra,
  getProveedoresGastos_SinRep,
  obtenerGastosxRangeDate
} = require("../controller/gastos.controller");
const router = Router();
/**
 * [API Documentation]
 * /api/egreso
 */
router.get("/orden-compra/:id_enterp", obtenerOrdenCompra);

router.get("/range-date/:id_empresa", obtenerGastosxRangeDate)
router.post("/post-egreso", postGasto);
router.get("/get-egresos/:id_enterp", getGastos);
router.get("/get-egreso/:id", getGasto);  
router.put("/put-egreso/:id", putGasto);
router.put("/delete-egreso/:id", deleteGasto);
router.get("/get-gasto-x-grupo/:id_enterp", getGastoxGrupo);
router.get("/get-proveedores-unicos", getProveedoresGastos_SinRep);
// router.get('/')

module.exports = router;
