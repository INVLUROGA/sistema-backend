const { Router } = require("express");
const {
  getPenalidadxIDContrato,
  onDeletePenalidadxID,
  onPutPenalidadxID,
  getPenalidadxID,
  postPenalidad,
  getPenalidades
} = require("../controller/penalidad.controller");
const router = Router();
/**
 * /api/penalidad
 */

router.get('/', getPenalidades)
router.get("/:id_contrato", getPenalidadxIDContrato);
router.get("/id/:id", getPenalidadxID);
router.post("/:id_contrato", postPenalidad);
router.put("/delete/:id", onDeletePenalidadxID);
router.put("/:id", onPutPenalidadxID);
// router.post("")
module.exports = router;
