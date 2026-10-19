const { Router } = require("express");

const { postDocWsp } = require("../controller/wsp.controller.js");
// const { recibirWebhookWsp } = require("../controller/wsp.webhook.controller.js");
const {
  verificarWebhookWsp,
  recibirMensajeWsp,
  getChatsWsp,
  getMensajesxChat,
} = require("../controller/mensajeWsp.controller.js");
const { validarJWT } = require("../middlewares/validarJWT.js");
const router = Router();
/**
 * [API Documentation]
 * /api/wsp
 */
router.post("/doc", postDocWsp);
// router.post("/webhook", recibirWebhookWsp);
// webhook de WhatsApp Cloud API: sin JWT, Meta lo valida con el token de verificación y la firma
router.get("/webhook", verificarWebhookWsp);
router.post("/webhook", recibirMensajeWsp);
router.get("/chats", validarJWT, getChatsWsp);
router.get("/mensajes/:chat", validarJWT, getMensajesxChat);
// router.get('/')

module.exports = router;
