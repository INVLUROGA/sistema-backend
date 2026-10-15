const { Router } = require("express");
const {
  getProspectosRedes,
  getCampaniasMeta,
} = require("../controller/prospectoRedes.controller");
const router = Router();
/*
/api/prospectos-redes
*/

router.get("/", getProspectosRedes);
router.get("/meta/campanias", getCampaniasMeta);

module.exports = router;
