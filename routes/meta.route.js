const { Router } = require("express");
const {
  getMetas,
  getOneMeta,
  postMeta,
  updateOneMeta,
  deleteOneMeta,
  postMetaAsesor,
  getMetasAsesorxMeta,
  getUltimaMetaxAsesor,
  deleteOneMetaAsesor,
} = require("../controller/meta.controller.js");
const router = Router();
/**
 * [API Documentation]
 * /api/meta/
 */
router.post("/post_meta", postMeta);
router.get("/getOneMeta/:id", getOneMeta);
router.get("/getMetas", getMetas);
router.put("/update_meta/:id", updateOneMeta);
router.put("/delete_meta/:id", deleteOneMeta);
//meta vs asesor
router.post("/meta_asesor/post_meta/:id_meta", postMetaAsesor);
router.get("/meta_asesor/get_metas_asesor/:id_meta", getMetasAsesorxMeta);
router.get("/meta_asesor/ultimas", getUltimaMetaxAsesor);
router.delete(
  "/meta_asesor/remove_meta_asesor/:id_meta_asesor",
  deleteOneMetaAsesor
);
module.exports = router;
