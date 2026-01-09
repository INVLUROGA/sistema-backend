const { Router } = require("express");
const {
  PostCuentaBalance,
  GetCuentaBalancexID,
  GetCuentaBalancesxIDEmpresaxTipo,
  updateCuentaBalancexID,
  deleteCuentaBalancexID,
  GetCuentaBalancesxIDEmpresaxTipoxFecComprobante,
} = require("../controller/cuentaBalance.controller");
const router = Router();

/**
 * /api/cuenta-balance
 */
router.post("/:id_empresa/:tipo", PostCuentaBalance);
router.get("/id/:id", GetCuentaBalancexID);
router.get("/:id_empresa/:tipo", GetCuentaBalancesxIDEmpresaxTipo);
router.put("/id/:id", updateCuentaBalancexID);
router.put("/delete/id/:id", deleteCuentaBalancexID);
router.get(
  "/fecha-comprobante/:id_empresa/:tipo",
  GetCuentaBalancesxIDEmpresaxTipoxFecComprobante
);
module.exports = router;
