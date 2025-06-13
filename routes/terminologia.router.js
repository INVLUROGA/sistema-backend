const { Router, Route } = require("express");
const { route } = require("./recursosHumanos.route");
const {
  terminologiasPorEntidad,
  comboMesActivoVentas,
  terminologiasGastosxEmpresa,
  postterminologiasGastosxEmpresa,
  putterminologiasGastosxEmpresa,
  deleteterminologiasGastosxEmpresa,
} = require("../controller/terminologia.controller");
const router = Router();

router.get("/terminologiaPorEntidad", terminologiasPorEntidad);

router.get("/terminologiaxEmpresa/:id_empresa", terminologiasGastosxEmpresa);
router.post("/terminologiaxEmpresa", postterminologiasGastosxEmpresa);
router.put("/terminologiagastoxid/:id", putterminologiasGastosxEmpresa);
router.put(
  "/terminologiagastoxid/delete/:id",
  deleteterminologiasGastosxEmpresa
);

router.get("/combo-mes-activo-ventas", comboMesActivoVentas);
module.exports = router;
