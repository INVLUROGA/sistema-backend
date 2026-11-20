const { Router } = require("express");
const {
  getProspectosRedes,
  getCampaniasMeta,
  getSeguidoresRedes,
  getMetricasSemanalesRedes,
  getPublicacionesRedes,
} = require("../controller/prospectoRedes.controller");
const router = Router();
/*
/api/prospectos-redes
*/

router.get("/", getProspectosRedes);
router.get("/meta/campanias", getCampaniasMeta);
router.get("/seguidores", getSeguidoresRedes);
router.get("/metricas-semanales", getMetricasSemanalesRedes);
router.get("/publicaciones", getPublicacionesRedes);

module.exports = router;
