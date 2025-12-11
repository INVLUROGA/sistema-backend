const { Router } = require("express");
const {
  GetArticuloxID,
  GetArticulos,
  PostArticulo,
  deleteArticuloxID,
  updateArticuloxID,
} = require("../controller/articulo.controller");
const router = Router();

/**
 * /api/producto
 */
router.post("/", PostArticulo);
router.get("/id/:id", GetArticuloxID);
router.get("/", GetArticulos);
router.put("/id/:id", updateArticuloxID);
router.put("/delete/id/:id", deleteArticuloxID);

module.exports = router;
