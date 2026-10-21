const { request, response } = require("express");
const crypto = require("crypto");
const { Op, QueryTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { MensajeWsp } = require("../models/MensajeWsp");
const { Usuario } = require("../models/Usuarios");

/**
 * Webhook de WhatsApp Cloud API (Meta). Solo se guardan los mensajes de texto.
 * En la app de Meta > WhatsApp > Configuración:
 *  - URL de devolución de llamada: https://<backend>/api/wsp/webhook
 *  - Token de verificación: el valor de WSP_CLOUD_VERIFY_TOKEN
 *  - Campos suscritos: messages (y smb_message_echoes si se usa la app WhatsApp Business)
 * Variables de entorno:
 *  - WSP_CLOUD_VERIFY_TOKEN: token de verificación del webhook
 *  - WSP_CLOUD_APP_SECRET: clave secreta de la app, valida la firma X-Hub-Signature-256
 */

// Un estado solo reemplaza a otro "anterior" (Meta puede enviarlos desordenados)
const ORDEN_ESTADO = { sent: 1, delivered: 2, read: 3, failed: 4 };

const fechaDeTimestamp = (timestamp) =>
  timestamp ? new Date(Number(timestamp) * 1000) : new Date();

const guardarMensaje = async (datos) => {
  try {
    await MensajeWsp.create(datos);
  } catch (error) {
    // Meta reintentó el webhook: el mensaje ya estaba guardado
    if (error.name === "SequelizeUniqueConstraintError") return;
    // Datos que nunca se podrán guardar: con un 500 Meta reintentaría el envío para siempre
    if (error.name === "SequelizeValidationError") {
      return console.error("Mensaje wsp no guardado:", datos.id_mensaje, error.message);
    }
    throw error;
  }
};

/**
 * Chat del cliente. Si usa nombre de usuario, Meta puede enviar solo su BSUID (user_id) sin
 * el número: se usa el chat donde ya están sus mensajes y, si es nuevo, el BSUID.
 * Cuando llega con número, los mensajes que se guardaron con el BSUID pasan al chat del número.
 */
const resolverChat = async (numero, idUsuario) => {
  if (numero) {
    if (idUsuario) {
      await MensajeWsp.update({ chat: numero }, { where: { chat: idUsuario } });
    }
    return numero;
  }
  if (!idUsuario) return null;
  const anterior = await MensajeWsp.findOne({
    where: { id_usuario_wsp: idUsuario },
    attributes: ["chat"],
    order: [["id", "DESC"]],
  });
  return anterior?.chat || idUsuario;
};

// Estado (enviado, entregado, leído) de un mensaje enviado que ya está guardado
const guardarEstado = async (s) => {
  const existente = await MensajeWsp.findOne({ where: { id_mensaje: s.id } });
  if (!existente) return;
  if ((ORDEN_ESTADO[s.status] || 0) > (ORDEN_ESTADO[existente.estado] || 0)) {
    const error = s.errors?.[0]
      ? `${s.errors[0].code} ${s.errors[0].title} ${s.errors[0].error_data?.details || ""}`.trim()
      : existente.error;
    await existente.update({ estado: s.status, error });
  }
};

const firmaValida = (req) => {
  const secreto = process.env.WSP_CLOUD_APP_SECRET;
  if (!secreto) return true;
  const firma = req.header("x-hub-signature-256") || "";
  if (!req.rawBody) return false;
  const esperada =
    "sha256=" + crypto.createHmac("sha256", secreto).update(req.rawBody).digest("hex");
  return (
    firma.length === esperada.length &&
    crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))
  );
};

// GET: Meta verifica la URL del webhook al configurarla
const verificarWebhookWsp = (req = request, res = response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token && token === process.env.WSP_CLOUD_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
};

// POST: mensajes de texto recibidos, los enviados desde la app WhatsApp Business y sus estados
const recibirMensajeWsp = async (req = request, res = response) => {
  if (!firmaValida(req)) return res.sendStatus(401);
  const { object, entry } = req.body || {};
  if (object !== "whatsapp_business_account") return res.sendStatus(200);
  try {
    for (const { changes = [] } of entry || []) {
      for (const { field, value = {} } of changes) {
        const numero_negocio = value.metadata?.display_phone_number || null;
        if (field === "messages") {
          // Nombre de perfil o, si no tiene, su nombre de usuario; por número (wa_id) o BSUID (user_id)
          const nombres = {};
          for (const c of value.contacts || []) {
            const nombre = c.profile?.name || (c.profile?.username ? `@${c.profile.username}` : null);
            if (c.wa_id) nombres[c.wa_id] = nombre;
            if (c.user_id) nombres[c.user_id] = nombre;
          }
          for (const m of value.messages || []) {
            if (m.type !== "text") continue;
            const chat = await resolverChat(m.from, m.from_user_id);
            if (!chat) continue;
            await guardarMensaje({
              id_mensaje: m.id,
              chat,
              id_usuario_wsp: m.from_user_id || null,
              numero_negocio,
              nombre: nombres[m.from] || nombres[m.from_user_id] || null,
              enviado_por_mi: false,
              tipo: m.type,
              body: m.text?.body,
              fecha: fechaDeTimestamp(m.timestamp),
            });
          }
          for (const s of value.statuses || []) {
            await guardarEstado(s);
          }
        }
        // Mensajes que el negocio envió desde la app WhatsApp Business (coexistencia)
        if (field === "smb_message_echoes") {
          for (const m of value.message_echoes || []) {
            if (m.type !== "text") continue;
            const chat = await resolverChat(m.to, m.to_user_id);
            if (!chat) continue;
            await guardarMensaje({
              id_mensaje: m.id,
              chat,
              id_usuario_wsp: m.to_user_id || null,
              numero_negocio,
              enviado_por_mi: true,
              tipo: m.type,
              body: m.text?.body,
              fecha: fechaDeTimestamp(m.timestamp),
            });
          }
        }
      }
    }
    res.sendStatus(200);
  } catch (error) {
    // Con un status distinto de 200 Meta reintenta el envío
    console.error("Error webhook mensajes wsp:", error);
    res.sendStatus(500);
  }
};

// Conversaciones con su último mensaje. ?busqueda= filtra por número o nombre
const getChatsWsp = async (req = request, res = response) => {
  const busqueda = (req.query.busqueda || "").trim();
  try {
    const chats = await db.query(
      `WITH ult AS (
         SELECT *,
           ROW_NUMBER() OVER (PARTITION BY chat ORDER BY fecha DESC, id DESC) AS fila,
           COUNT(*) OVER (PARTITION BY chat) AS total,
           MAX(gestionadoPor) OVER (PARTITION BY chat) AS gestionado_chat
         FROM tb_mensaje_wsp
       )
       SELECT TOP 200 m.chat, m.body, m.fecha, m.enviado_por_mi, m.total, n.nombre,
         m.gestionado_chat AS gestionadoPor
       FROM ult m
       OUTER APPLY (
         SELECT TOP 1 x.nombre FROM tb_mensaje_wsp x
         WHERE x.chat = m.chat AND x.nombre IS NOT NULL AND x.nombre <> ''
         ORDER BY x.id DESC
       ) n
       WHERE m.fila = 1
         AND (:busqueda = '' OR m.chat LIKE :like OR n.nombre LIKE :like)
       ORDER BY m.fecha DESC`,
      {
        replacements: { busqueda, like: `%${busqueda}%` },
        type: QueryTypes.SELECT,
      },
    );
    res.status(200).json({
      ok: true,
      chats,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller(getChatsWsp) de mensajes wsp, hable con el administrador: ${error}`,
    });
  }
};

// Mensajes de un chat, del más antiguo al más reciente.
// ?antesDe=<id> pagina hacia atrás (mensajes anteriores a ese mensaje)
const getMensajesxChat = async (req = request, res = response) => {
  const { chat } = req.params;
  const antesDe = Number(req.query.antesDe);
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  try {
    let filtroAntesDe = {};
    if (antesDe) {
      const referencia = await MensajeWsp.findByPk(antesDe, { attributes: ["fecha"] });
      if (referencia) {
        filtroAntesDe = {
          [Op.or]: [
            { fecha: { [Op.lt]: referencia.fecha } },
            { fecha: referencia.fecha, id: { [Op.lt]: antesDe } },
          ],
        };
      }
    }
    const mensajes = await MensajeWsp.findAll({
      where: { chat, ...filtroAntesDe },
      attributes: ["id", "chat", "nombre", "enviado_por_mi", "body", "estado", "error", "fecha"],
      order: [
        ["fecha", "DESC"],
        ["id", "DESC"],
      ],
      limit: limit + 1,
      raw: true,
    });
    const hayMas = mensajes.length > limit;
    res.status(200).json({
      ok: true,
      mensajes: mensajes.slice(0, limit).reverse(),
      hayMas,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller(getMensajesxChat) de mensajes wsp, hable con el administrador: ${error}`,
    });
  }
};

// "Agregar a mi lead": el usuario conectado toma el chat. Un chat solo puede tener un responsable
const gestionarChatWsp = async (req = request, res = response) => {
  const { chat } = req.params;
  try {
    const gestionado = await MensajeWsp.findOne({
      where: { chat, gestionadoPor: { [Op.ne]: null } },
      attributes: ["gestionadoPor"],
    });
    if (gestionado) {
      return res
        .status(400)
        .json({ ok: false, msg: `Este chat ya es lead de ${gestionado.gestionadoPor}` });
    }
    // el nombre se lee de la BD: req.name puede venir vacío tras renovar el token
    const usuario = await Usuario.findOne({
      where: { id_user: req.id_user },
      attributes: ["nombres_user", "apellidos_user"],
    });
    const gestionadoPor =
      `${usuario?.nombres_user || ""} ${usuario?.apellidos_user || ""}`.trim() || req.name;
    const [actualizados] = await MensajeWsp.update({ gestionadoPor }, { where: { chat } });
    if (!actualizados) {
      return res.status(404).json({ ok: false, msg: "El chat no existe" });
    }
    res.status(200).json({
      ok: true,
      gestionadoPor,
      msg: "success",
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller(gestionarChatWsp) de mensajes wsp, hable con el administrador: ${error}`,
    });
  }
};

module.exports = {
  verificarWebhookWsp,
  recibirMensajeWsp,
  getChatsWsp,
  getMensajesxChat,
  gestionarChatWsp,
};
