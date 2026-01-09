const { Router } = require("express");
const {
  GetArticuloxID,
  GetArticulosxEmpresa,
  PostArticulo,
  deleteArticuloxID,
  updateArticuloxID,
  getHistArticulosxEmpresa,
} = require("../controller/articulo.controller");
const router = Router();

/**
 * /api/producto
 */
router.post("/:id_empresa", PostArticulo);
router.get("/id/:id", GetArticuloxID);
router.get("/:id_empresa", GetArticulosxEmpresa);
router.put("/id/:id", updateArticuloxID);
router.put("/delete/id/:id", deleteArticuloxID);
router.get("/historial/:id_empresa", getHistArticulosxEmpresa);
module.exports = router;
