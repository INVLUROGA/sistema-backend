const { Router } = require("express");
const {
  extraerPagos,
  extraerVentaMembresia,
  extraerCredencialesCliente,
  extraerFirma,
  extraerCitas,
  extraerProductos,
  postNewVenta,
  extraerTraspasos,
  extraerVentaTransferenciaMembresia,
  generarContrato,
  suplementarFechas,
  extraerServicios,
  extraerProductosCIRCUS,
  extraerProductos2,
} = require("../middlewares/extraerVentas");
const {
  postVenta,
  get_VENTA_ID,
  mailMembresia,
  getPDF_CONTRATO,
  get_VENTAS,
  getVentasxFecha,
  obtener_contrato_pdf,
  postTraspasoMembresia,
  estadosClienteMembresiaVar,
  comparativaPorProgramaApi,
  obtenerContratosClientes,
  obtenerVentasMembresiaxEmpresa,
  obtenerClientesVentas,
  obtenerClientesxDistritos,
  agregarFirmaEnContrato,
  obtenerComparativoResumen,
  obtenerComparativoResumenDashboard,
  obtenerEstadoResumen,
  obtenerVentasDeClientesNuevos,
  obtenerTransferenciasxFecha,
  obtenerClientesConMembresia,
  obtenerComparativoResumenxMES,
  postCambioPrograma,
  obtenerTransferenciasResumenxMes,
  obtenerMembresias,
  obtenerMarcacionesClientexMembresias,
  obtenerMembresiasxUIDcliente,
  putVentaxId,
  obtenerComparativoTotal,
  postCajaApertura,
  buscarCajasxFecha,
  obtenerUltimasVentasxComprobantes,
  get_VENTAS_CIRCUS,
  postVentaProductos,
  postVentaServicios,
  postComanda,
  getComandas,
  updateDetalleProducto,
  updateDetalleServicio,
  getVencimientosPorMes,
  obtenerVentasxIdCli,
  getVentasDashboard,
  getVentasxFechaVenta,
} = require("../controller/venta.controller");

const {
  obtenerMembresiasxFecha,
} = require("../controller/venta-membresias.controller");
const {
  obtenerReporteSociosxDistritos,
  obtenerTransferencias,
} = require("../controller/reporte.controller");
const { validarComandaPagada } = require("../middlewares/validarComandaPagada");
const router = Router();

/*
/api/venta
*/
router.get("/id_cli/:id_cli", obtenerVentasxIdCli);
router.get("/comanda/:id_empresa", getComandas);
router.post("/comanda/:id_empresa", postComanda);
router.post("/servicios/:id_venta", validarComandaPagada, postVentaServicios);
router.get("/get-ventas-x-fecha/:id_empresa", getVentasxFecha);
router.get("/fecha-venta/id_empresa/:id_empresa", getVentasxFechaVenta);
router.post("/productos/:id_venta", validarComandaPagada, postVentaProductos);
router.get(
  "/obtener-ventas-x-comprobante/:id_comprobante/:id_empresa",
  obtenerUltimasVentasxComprobantes,
);
router.post("/caja-apertura/:id_enterprice", postCajaApertura);
router.get("/buscar-cajas", buscarCajasxFecha);
router.post(
  "/post-ventas/:id_enterprice",
  extraerProductos2,
  extraerServicios,
  extraerCredencialesCliente,
  extraerVentaMembresia,
  extraerTraspasos,
  extraerVentaTransferenciaMembresia,
  extraerProductos,
  extraerCitas,
  extraerPagos,
  postNewVenta,
  postVenta,
);
router.put("/put-venta/:id", putVentaxId);
router.post("/cambio-programa", postCambioPrograma);
router.get("/cliente-ventas", obtenerClientesVentas);
router.get(
  "/get-ventas-membresia-x-empresa/:id_empresa",
  obtenerVentasMembresiaxEmpresa,
);
router.post("/post-venta/agregar-firma-en-contrato", agregarFirmaEnContrato);
// router.post("/send-email/:id_venta", mailMembresia);
router.get("/reporte/obtener-todo-membresias", obtenerMembresias);
router.get("/reporte/obtener-todo-membresias-x-fecha", obtenerMembresias);
router.post("/traspaso-membresia", postTraspasoMembresia);
router.get("/get-ventas/599", get_VENTAS_CIRCUS);
router.get("/get-ventas/:id_empresa", get_VENTAS);
router.get("/get-ventas-dashboard/:id_empresa", getVentasDashboard);
router.post("/invoice-mail/:id_venta", mailMembresia);
router.get("/get-id-ventas/:id", get_VENTA_ID);
router.post("/invoice-PDFcontrato", obtener_contrato_pdf);
router.put("/update-colaborador-servicio/:id", updateDetalleServicio);
router.put("/update-colaborador-producto/:id", updateDetalleProducto);
// router.post("/")
router.post("/estado-membresia", estadosClienteMembresiaVar);

router.get(
  "/obtener-contratos-clientes/:id_enterprice",
  obtenerContratosClientes,
);
router.get("/comparativaPorProgramaApi/:fecha", comparativaPorProgramaApi);

router.get(
  "/reporte/reporte-ventas-x-programa/:id_pgm",
  obtenerReporteSociosxDistritos,
);
router.get(
  "/reporte/obtener-comparativo-resumen-x-mes-anio",
  obtenerComparativoResumenxMES,
);
router.get(
  "/reporte/obtener-transferencias-resumen-x-mes-anio",
  obtenerTransferenciasResumenxMes,
);
router.get("/reporte/obtener-transferencias/:id_pgm", obtenerTransferencias);
router.get("/reporte/obtener-comparativo-resumen", obtenerComparativoResumen);
router.get(
  "/reporte/obtener-comparativo-resumen-dashboard",
  obtenerComparativoResumenDashboard,
);
router.get("/reporte/obtener-comparativo", obtenerComparativoTotal);

router.get(
  "/reporte/obtener-ventas-x-tipo-factura/:idtipofactura",
  obtenerComparativoResumen,
);
router.get(
  "/reporte/obtener-estado-cliente-resumen/:id_origen",
  obtenerEstadoResumen,
);
router.get(
  "/reporte/obtener-nuevos-clientes-resumen",
  obtenerVentasDeClientesNuevos,
);
router.get("/ventas-transferencias", obtenerTransferenciasxFecha);
router.get("/clientes-membresias", obtenerClientesConMembresia);

router.get("/obtener-membresias-x-cli/:id_cli", obtenerMembresiasxUIDcliente);

router.get(
  "/membresias/cliente/marcaciones/:id_enterprice",
  obtenerMarcacionesClientexMembresias,
);
router.get(
  "/reporte/obtenerMembresiasxFecha/:id_enterprice",
  obtenerMembresiasxFecha,
);

router.get("/vencimientos-mes", getVencimientosPorMes);

module.exports = router;
