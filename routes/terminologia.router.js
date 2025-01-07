const { Router, Route } = require("express");
const { route } = require("./recursosHumanos.route");
const { terminologiasPorEntidad, comboMesActivoVentas } = require("../controller/terminologia.controller");
const router = Router();

router.get("/terminologiaPorEntidad" , terminologiasPorEntidad);

router.get('/combo-mes-activo-ventas', comboMesActivoVentas)
module.exports = router;