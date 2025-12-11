    const { Router } = require("express");

const { postDocWsp } = require("../controller/wsp.controller.js");
const router = Router();
/**
 * [API Documentation]
 * /api/wsp
 */
router.post("/doc", postDocWsp);
// router.get('/')

module.exports = router;
