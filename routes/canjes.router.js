const { Router } = require("express");
const {
  deleteCanje,
  obtenerCanjes,
  postCanje,
  updateCanje,
  obtenerCanje,
} = require("../controller/canjes.controller");
const router = Router();
/**
 * /api/cambio-programa
 */

router.get("/canjes", obtenerCanjes);
router.get("/canje/:id", obtenerCanje);
router.post("/canje/:id_empresa", postCanje);
router.put("/canje/delete", deleteCanje);
router.put("/canje/update", updateCanje);
// router.post("")
module.exports = router;
