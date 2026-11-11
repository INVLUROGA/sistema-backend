const { Router } = require("express");
const {
  getActas,
  getActaxID,
  postActa,
  putActa,
  deleteActa,
  deleteArchivoActa,
} = require("../controller/actas.controller");
const router = Router();
/**
 * /api/actas
 */
router.get("/", getActas);
router.get("/id/:id", getActaxID);
router.post("/", postActa);
router.put("/delete/:id", deleteActa);
router.put("/archivo/delete/:id_image", deleteArchivoActa);
router.put("/id/:id", putActa);

module.exports = router;
