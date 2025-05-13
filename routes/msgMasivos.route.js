const { Router } = require("express");
const { enviarMasivoAlwsp } = require("../controller/MsgMasivo.controller");
const router = Router();
router.get("/masivo/wsp", enviarMasivoAlwsp);

module.exports = router;
