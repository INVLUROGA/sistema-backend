const { Router } = require("express");
const { getSeguimientos } = require("../controller/seguimiento.controller");
const router = Router();

/**
 * /api/seguimiento
 */

router.get("/", getSeguimientos);

module.exports = router;
