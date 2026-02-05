const { Router } = require("express");

const { postDocWsp } = require("../controller/wsp.controller.js");
// const { recibirWebhookWsp } = require("../controller/wsp.webhook.controller.js");
const router = Router();
/**
 * [API Documentation]
 * /api/wsp
 */
router.post("/doc", postDocWsp);
// router.post("/webhook", recibirWebhookWsp);
// router.get('/')

module.exports = router;
