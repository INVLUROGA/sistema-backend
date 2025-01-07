const { Router } = require("express");
const { obtenerRelojZk } = require("../../controller/ZkTeco/zkTeco.controller");
const router = Router();

router.get("/obtener-tipo-cambio", obtenerRelojZk);
module.exports = router;
