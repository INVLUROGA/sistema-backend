const { Router } = require("express");
const {
  getigv,
  getIgvxEmpresa,
  postigv,
  deleteIgv,
  updateIgv,
  getHistArticulosxEmpresa,
} = require("../controller/gastosigv.controller");
const router = Router();

/**
 * /api/igv
 */
router.post("/:id_empresa", postigv);
router.get("/id/:id", getigv);
router.get("/empresa/:id_empresa", getIgvxEmpresa);
router.put("/id/:id", updateIgv);
router.put("/delete/id/:id", deleteIgv);
// router.post("");

module.exports = router;
