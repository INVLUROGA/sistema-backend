const { Router } = require("express");
const {
  getCanjeStatus,
  getCanjeStatusxID,
  postCanjeStatus,
  putCanjeStatus,
  deleteCanjeStatus,
  getPublicacionesCanje,
  getPublicacionCanjexID,
  postPublicacionCanje,
  putPublicacionCanje,
  deletePublicacionCanje,
} = require("../controller/canjeStatus.controller");
const router = Router();
/**
 * /api/canje-marketing
 */

// canje-status
router.get("/canje-status/empresa/:id_empresa", getCanjeStatus);
router.get("/canje-status/id/:id", getCanjeStatusxID);
router.post("/canje-status/empresa/:id_empresa", postCanjeStatus);
router.put("/canje-status/delete/:id", deleteCanjeStatus);
router.put("/canje-status/id/:id", putCanjeStatus);

// publicaciones-canje
router.get("/publicaciones-canje/empresa/:id_empresa", getPublicacionesCanje);
router.get("/publicaciones-canje/id/:id", getPublicacionCanjexID);
router.post("/publicaciones-canje/empresa/:id_empresa", postPublicacionCanje);
router.put("/publicaciones-canje/delete/:id", deletePublicacionCanje);
router.put("/publicaciones-canje/id/:id", putPublicacionCanje);

module.exports = router;
