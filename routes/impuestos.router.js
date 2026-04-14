const { Router } = require("express");
const router = Router();
const {
  getImpuesto,
  postImpuesto,
  HISTORYpostImpuesto,
  getHistoryImpuesto,
  HISTORYgetxImpuesto,
  obtenerImpuestoIGV,
  obtenerPOSs,
  deletePOSxID,
  obtenerPOSxID,
  updatePOSxID,
  postPOS,
} = require("../controller/Impuesto.controller.js");
/**
 * [API Documentation]
 * /api/impuestos/
 */
router.get("/history/post_impuesto/:id_impuesto", HISTORYpostImpuesto);
router.get("/get_impuesto", getImpuesto);
router.post("/post_impuesto", postImpuesto);
router.get("/history/get_impuesto/:id_impuesto", HISTORYgetxImpuesto);
router.post("/history/post_impuesto/:id_impuesto", HISTORYpostImpuesto);
router.get("/igv/obtener-impuesto-hoy", obtenerImpuestoIGV);

router.post("/pos/", postPOS);
router.get("/pos/", obtenerPOSs);
router.get("/pos/id/:id", obtenerPOSxID);
router.put("/pos/id/:id", updatePOSxID);
router.put("/pos/delete/id/:id", deletePOSxID);

module.exports = router;
