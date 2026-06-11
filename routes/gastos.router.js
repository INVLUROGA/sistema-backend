const { Router } = require("express");

const {
  getgastoxID,
  postGasto,
  getGastos,
  getGasto,
  putGasto,
  deleteGasto,
  getGastoxGrupo,
  obtenerOrdenCompra,
  getProveedoresGastos_SinRep,
  obtenerPagosContratos,
  obtenerGastosxFechasPago,
  obtenerGastosxFechasComprobante,
  obtenerFacturasxFechasComprobante,
  getFacturas,
} = require("../controller/gastos.controller");
const router = Router();
/**
 * [API Documentation]
 * /api/egreso
 */
router.post("/", postGasto);
router.get("/empresa/:id_empresa", getGastos);
router.get("/facturado/:id_facturado_por", getFacturas);
router.get("/id/:id", getgastoxID);
router.put("/id/:id", putGasto);
router.put("/delete/id/:id", deleteGasto);

router.get("/orden-compra/:id_enterp", obtenerOrdenCompra);
router.get("/fecha-pago/:id_empresa", obtenerGastosxFechasPago);
router.get("/fecha-comprobante/:id_empresa", obtenerGastosxFechasComprobante);
router.get(
  "/fecha-comprobante/facturas/:id_facturado_por",
  obtenerFacturasxFechasComprobante,
);
router.post("/post-egreso", postGasto);
router.get("/get-egresos/:id_empresa", getGastos);
router.get("/get-egreso/:id", getGasto);
router.put("/put-egreso/:id", putGasto);
router.put("/delete-egreso/:id", deleteGasto);
router.get("/get-gasto-x-grupo/:id_enterp", getGastoxGrupo);
router.get("/get-proveedores-unicos", getProveedoresGastos_SinRep);
router.get("/obtener-pagos-contratos/:id_enterp", obtenerPagosContratos);

module.exports = router;
