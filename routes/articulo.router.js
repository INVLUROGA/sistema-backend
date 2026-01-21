const { Router } = require("express");
const {
  GetArticuloxID,
  GetArticulosxEmpresa,
  PostArticulo,
  deleteArticuloxID,
  updateArticuloxID,
  getHistArticulosxEmpresa,
  GetArticulosxEmpresaxZona,
} = require("../controller/articulo.controller");
const router = Router();

/**
 * /api/producto
 */
router.post("/:id_empresa", PostArticulo);
router.get("/id/:id", GetArticuloxID);
router.get("/:id_empresa", GetArticulosxEmpresa);
router.get("/:id_empresa/zona/:id_lugar", GetArticulosxEmpresaxZona);
router.put("/id/:id", updateArticuloxID);
router.put("/delete/id/:id", deleteArticuloxID);
router.get("/historial/:id_empresa", getHistArticulosxEmpresa);
// router.post("");

module.exports = router;
