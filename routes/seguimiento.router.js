const { Router } = require("express");
const { getSeguimientos } = require("../controller/seguimiento.controller");
const router = Router();

/**
 * /api/seguimiento
 */

router.get("/", getSeguimientos);

router.get('/inactivo-x-3-meses')

module.exports = router;
