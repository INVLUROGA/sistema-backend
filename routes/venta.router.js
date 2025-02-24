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
} = require("../controller/venta.controller");

const {
  obtenerMembresiasxFecha,
} = require("../controller/venta-membresias.controller");
const {
  obtenerReporteSociosxDistritos,
  obtenerTransferencias,
} = require("../controller/reporte.controller");
const router = Router();
/*
/api/venta
*/
router.post(
  "/post-ventas/:id_enterprice",
  extraerCredencialesCliente,
  extraerVentaMembresia,
  extraerTraspasos,
  extraerVentaTransferenciaMembresia,
  extraerProductos,
  extraerCitas,
  extraerPagos,
  postNewVenta,
  postVenta
);
router.post("/cambio-programa", postCambioPrograma);
router.get("/cliente-ventas", obtenerClientesVentas);
router.get(
  "/get-ventas-membresia-x-empresa/:id_empresa",
  obtenerVentasMembresiaxEmpresa
);
router.post("/post-venta/agregar-firma-en-contrato", agregarFirmaEnContrato);
// router.post("/send-email/:id_venta", mailMembresia);
router.get("/reporte/obtener-todo-membresias", obtenerMembresias);
router.get("/reporte/obtener-todo-membresias-x-fecha", obtenerMembresias);
router.post("/traspaso-membresia", postTraspasoMembresia);
router.get("/get-ventas-x-fecha", getVentasxFecha);
router.get("/get-ventas/:id_empresa", get_VENTAS);
router.post("/invoice-mail/:id_venta", mailMembresia);
router.get("/get-id-ventas/:id", get_VENTA_ID);
router.post("/invoice-PDFcontrato", obtener_contrato_pdf);

// router.post("/")
router.post("/estado-membresia", estadosClienteMembresiaVar);

router.get(
  "/obtener-contratos-clientes/:id_enterprice",
  obtenerContratosClientes
);
router.get("/comparativaPorProgramaApi/?:fecha", comparativaPorProgramaApi);

router.get(
  "/reporte/reporte-ventas-x-programa/:id_pgm",
  obtenerReporteSociosxDistritos
);
router.get(
  "/reporte/obtener-comparativo-resumen-x-mes-anio",
  obtenerComparativoResumenxMES
);
router.get(
  "/reporte/obtener-transferencias-resumen-x-mes-anio",
  obtenerTransferenciasResumenxMes
);
router.get("/reporte/obtener-transferencias/:id_pgm", obtenerTransferencias);
router.get("/reporte/obtener-comparativo-resumen", obtenerComparativoResumen);
// router.get("/reporte/obtener-comparativo-resumen", obtenerComparativoResumen);

router.get(
  "/reporte/obtener-ventas-x-tipo-factura/:idtipofactura",
  obtenerComparativoResumen
);
router.get(
  "/reporte/obtener-estado-cliente-resumen/:id_origen",
  obtenerEstadoResumen
);
router.get(
  "/reporte/obtener-nuevos-clientes-resumen",
  obtenerVentasDeClientesNuevos
);
router.get("/ventas-transferencias", obtenerTransferenciasxFecha);
router.get("/clientes-membresias", obtenerClientesConMembresia);

router.get(
  "/obtener-membresias-x-cli/:id_cli",
  obtenerMembresiasxUIDcliente
);

router.get(
  "/membresias/cliente/marcaciones/:id_enterprice",
  obtenerMarcacionesClientexMembresias
);
router.get(
  "/reporte/obtenerMembresiasxFecha/:id_enterprice",
  obtenerMembresiasxFecha
);
// router.post('/')
// router.get(
//   "/reporte/obtener-ventas-x-comprobantes-resumen",
//   obtenerEstadoResumen
// );
module.exports = router;
