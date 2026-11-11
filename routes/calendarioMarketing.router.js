const { Router } = require("express");
const {
  getCalendarioMarketing,
  getCalendarioMarketingxID,
  postCalendarioMarketing,
  putCalendarioMarketing,
  deleteCalendarioMarketing,
  deleteArchivoCalendario,
} = require("../controller/calendarioMarketing.controller");
const router = Router();
/**
 * /api/calendario-marketing
 */
router.get("/empresa/:id_empresa", getCalendarioMarketing);
router.get("/id/:id", getCalendarioMarketingxID);
router.post("/empresa/:id_empresa", postCalendarioMarketing);
router.put("/delete/:id", deleteCalendarioMarketing);
router.put("/archivo/delete/:id_image", deleteArchivoCalendario);
router.put("/id/:id", putCalendarioMarketing);

module.exports = router;
