const { Router } = require("express");
const { postAudit, getTBAudit } = require("../controller/auditoria.controller");
const router = Router();
/*
/api/cambio-programa
*/

router.post("/post-auditoria", postAudit);
router.get("/get-auditoria", getTBAudit);
module.exports = router;
