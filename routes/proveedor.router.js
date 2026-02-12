const { Router } = require("express");
const {
  getTBProveedores,
  PostProveedores,
  getProveedor,
  getProveedorxUID,
  deleteProveedor,
  updateProveedor,
  getContratoxID,
  postContratoProv,
  getContratosxProv,
  getGastosxCodProv,
  getTBAgentes,
  descargarContratoProvPDF,
  obtenerContratosxProveedores,
  getTrabajos,
  postPenalidadesContratoProv,
  obtenerContratoProvxID,
  putContratoProv,
  deleteContratoxID,
  getProveedoresxEmpresaxTipo
} = require("../controller/proveedor.controller");
const { validarJWT } = require("../middlewares/validarJWT");
const router = Router();

router.get('/empresa/:id_empresa/tipo/:tipo', getProveedoresxEmpresaxTipo)
router.get("/obtener-proveedores/:tipo", getTBProveedores);
router.get("/obtener-agentes", getTBAgentes);
router.get("/obtener-proveedor-uid/:uid_param", getProveedorxUID);
router.post("/post-proveedor", PostProveedores);
router.get("/obtener-proveedor/:id", getProveedor);
router.put("/remove-proveedor/:id", deleteProveedor);
router.put("/update-proveedor/:id", updateProveedor);

router.get("/obtener-contratos/:id_prov", getContratosxProv);
router.get("/obtener-contrato/:id", getContratoxID);
router.get("/obtener-gastos/:cod_trabajo/:tipo_moneda", getGastosxCodProv);
router.post("/post-contrato-prov", postContratoProv);
router.put("/put-contrato-prov/:id", putContratoProv);
router.put("/delete-contrato-prov/:id", deleteContratoxID);
router.get("/obtener-trabajos-proveedores/:id_empresa", getTrabajos);
router.get("/contrato/:id", obtenerContratoProvxID);
router.get("/obtener-contrato-prov/:id_contratoprov", descargarContratoProvPDF);
router.get("/trabajos/:id_prov", obtenerContratosxProveedores);

router.post("/penalidad/:id_contrato_prov", postPenalidadesContratoProv);
module.exports = router;
