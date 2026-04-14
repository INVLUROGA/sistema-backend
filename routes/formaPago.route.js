const { Router } = require("express");
const {
  deleteFormaPagoxID,
  getFormaPago,
  getFormaPagoxID,
  postFormaPago,
  updateFormaPagoxID,
} = require("../controller/formaPago.controller");
const router = Router();
/**
 * /api/operadores-pago
 */

router.get("/", getFormaPago);
router.post("/", postFormaPago);
router.put("/:id", updateFormaPagoxID);
router.get("/id/:id", getFormaPagoxID);
router.put("/delete/:id", deleteFormaPagoxID);
// router.post("")
module.exports = router;
