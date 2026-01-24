const { Router, Route } = require("express");
const { route } = require("./recursosHumanos.route");
const {
  terminologiasPorEntidad,
  comboMesActivoVentas,
  terminologiasGastosxEmpresa,
  postterminologiasGastosxEmpresa,
  putterminologiasGastosxEmpresa,
  deleteterminologiasGastosxEmpresa,
  obtenerTerminologia2xEmpresaxTipo,
  postTerminologia2,
  updateTerminologia2xID,
  deleteTerminologia2xID,
  obtenerTerminologia1,
  postTerminologia1,
  updateTerminologia1xID,
  deleteTerminologia1xID,
} = require("../controller/terminologia.controller");
const router = Router();

router.get("/terminologiaPorEntidad", terminologiasPorEntidad);

router.get(
  "/terminologiaxEmpresa/:id_empresa/:id_tipo",
  terminologiasGastosxEmpresa,
);
router.post("/terminologiaxEmpresa", postterminologiasGastosxEmpresa);
router.put("/terminologiagastoxid/:id", putterminologiasGastosxEmpresa);
router.put(
  "/terminologiagastoxid/delete/:id",
  deleteterminologiasGastosxEmpresa,
);

router.get("/combo-mes-activo-ventas", comboMesActivoVentas);

// * TODO: RUTAS PARA TERMINOLOGIAS, NUEVAS:
router.get("/term2/:id_empresa/:tipo", obtenerTerminologia2xEmpresaxTipo);
router.post("/term2/:id_empresa/:tipo", postTerminologia2);
router.put("/term2/id/:id", updateTerminologia2xID);
router.put("/term2/delete/id/:id", deleteTerminologia2xID);

router.get("/term1", obtenerTerminologia1);
router.post("/term1", postTerminologia1);
router.put("/term1/id/:id", updateTerminologia1xID);
router.put("/term1/delete/id/:id", deleteTerminologia1xID);

// router.put('/')
module.exports = router;
