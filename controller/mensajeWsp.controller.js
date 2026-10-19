const { request, response } = require("express");
const crypto = require("crypto");
const axios = require("axios");
const { Op, QueryTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { MensajeWsp } = require("../models/MensajeWsp");

/**
 * Webhook de WhatsApp Cloud API (Meta). En la app de Meta > WhatsApp > Configuración:
 *  - URL de devolución de llamada: https://<backend>/api/wsp/webhook
 *  - Token de verificación: el valor de WSP_CLOUD_VERIFY_TOKEN
 *  - Campos suscritos: messages (y smb_message_echoes si se usa la app WhatsApp Business)
 * Variables de entorno:
 *  - WSP_CLOUD_VERIFY_TOKEN: token de verificación del webhook
 *  - WSP_CLOUD_APP_SECRET: clave secreta de la app, valida la firma X-Hub-Signature-256
 *  - WSP_CLOUD_TOKEN: token de acceso, para descargar los archivos (media)
 */
const GRAPH_URL = "https://graph.facebook.com/v24.0";

const TIPOS_MEDIA = ["image", "video", "audio", "document", "sticker"];
// Un estado solo reemplaza a otro "anterior" (Meta puede enviarlos desordenados)
const ORDEN_ESTADO = { sent: 1, delivered: 2, read: 3, failed: 4 };

const fechaDeTimestamp = (timestamp) =>
  timestamp ? new Date(Number(timestamp) * 1000) : new Date();

// Texto, archivo, etc. de un mensaje según su tipo
const leerContenido = (m) => {
  if (m.type === "text") return { body: m.text?.body };
  if (TIPOS_MEDIA.includes(m.type)) {
    const media = m[m.type] || {};
    return {
      body: media.caption || null,
      id_media: media.id,
      mime_type: media.mime_type,
      nombre_archivo: media.filename || null,
    };
  }
  if (m.type === "location") {
    const { name, address, latitude, longitude } = m.location || {};
    return {
      body: [name, address, `${latitude},${longitude}`].filter(Boolean).join(" - "),
    };
  }
  if (m.type === "contacts") {
    return {
      body: (m.contacts || [])
        .map(
          (c) =>
            `${c.name?.formatted_name || ""} ${(c.phones || []).map((p) => p.phone).join(", ")}`.trim()
        )
        .join("\n"),
    };
  }
  if (m.type === "interactive") {
    const i = m.interactive || {};
    return { body: i.button_reply?.title || i.list_reply?.title || i.nfm_reply?.body || null };
  }
  if (m.type === "button") return { body: m.button?.text };
  if (m.type === "reaction") {
    return {
      body: m.reaction?.emoji ? `Reaccionó ${m.reaction.emoji}` : "Quitó su reacción",
    };
  }
  return { body: m.errors?.[0]?.title || null };
};

// Si el estado del mensaje llegó antes que el mensaje (fila "saliente"), se completa
const guardarMensaje = async (datos) => {
  const existente = await MensajeWsp.findOne({ where: { id_mensaje: datos.id_mensaje } });
  if (!existente) {
    try {
      return await MensajeWsp.create(datos);
    } catch (error) {
      // Meta reintentó el webhook mientras se guardaba
      if (error.name === "SequelizeUniqueConstraintError") return;
      throw error;
    }
  }
  if (existente.tipo === "saliente") {
    const { estado, ...contenido } = datos;
    await existente.update(contenido);
  }
};

const guardarEstado = async (s, numero_negocio) => {
  const estado = s.status;
  const error = s.errors?.[0]
    ? `${s.errors[0].code} ${s.errors[0].title} ${s.errors[0].error_data?.details || ""}`.trim()
    : null;
  const existente = await MensajeWsp.findOne({ where: { id_mensaje: s.id } });
  if (!existente) {
    // Mensaje enviado por API desde otro sistema: Meta no manda su contenido, solo su estado
    return guardarMensaje({
      id_mensaje: s.id,
      chat: s.recipient_id,
      numero_negocio,
      enviado_por_mi: true,
      tipo: "saliente",
      estado,
      error,
      fecha: fechaDeTimestamp(s.timestamp),
    });
  }
  if ((ORDEN_ESTADO[estado] || 0) > (ORDEN_ESTADO[existente.estado] || 0)) {
    await existente.update({ estado, error: error || existente.error });
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

// POST: mensajes recibidos, ecos de la app WhatsApp Business y estados de los enviados
const recibirMensajeWsp = async (req = request, res = response) => {
  if (!firmaValida(req)) return res.sendStatus(401);
  const { object, entry } = req.body || {};
  if (object !== "whatsapp_business_account") return res.sendStatus(200);
  try {
    for (const { changes = [] } of entry || []) {
      for (const { field, value = {} } of changes) {
        const numero_negocio = value.metadata?.display_phone_number || null;
        if (field === "messages") {
          const nombres = Object.fromEntries(
            (value.contacts || []).map((c) => [c.wa_id, c.profile?.name])
          );
          for (const m of value.messages || []) {
            await guardarMensaje({
              id_mensaje: m.id,
              chat: m.from,
              numero_negocio,
              nombre: nombres[m.from] || null,
              enviado_por_mi: false,
              tipo: m.type,
              ...leerContenido(m),
              fecha: fechaDeTimestamp(m.timestamp),
            });
          }
          for (const s of value.statuses || []) {
            await guardarEstado(s, numero_negocio);
          }
        }
        // Mensajes que el negocio envió desde la app WhatsApp Business (coexistencia)
        if (field === "smb_message_echoes") {
          for (const m of value.message_echoes || []) {
            await guardarMensaje({
              id_mensaje: m.id,
              chat: m.to,
              numero_negocio,
              enviado_por_mi: true,
              tipo: m.type,
              ...leerContenido(m),
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
           COUNT(*) OVER (PARTITION BY chat) AS total
         FROM tb_mensaje_wsp
       )
       SELECT TOP 200 m.chat, m.body, m.tipo, m.fecha, m.enviado_por_mi, m.total, n.nombre
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
      attributes: [
        "id",
        "chat",
        "nombre",
        "enviado_por_mi",
        "tipo",
        "body",
        "id_media",
        "mime_type",
        "nombre_archivo",
        "estado",
        "error",
        "fecha",
      ],
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

// Descarga un archivo de un mensaje desde Meta (su URL requiere el token y expira en minutos)
const getMediaWsp = async (req = request, res = response) => {
  const { id_media } = req.params;
  try {
    const mensaje = await MensajeWsp.findOne({ where: { id_media }, attributes: ["id"] });
    if (!mensaje) {
      return res.status(404).json({ ok: false, msg: "El archivo no existe" });
    }
    const headers = { Authorization: `Bearer ${process.env.WSP_CLOUD_TOKEN}` };
    const { data: media } = await axios.get(`${GRAPH_URL}/${id_media}`, { headers });
    const archivo = await axios.get(media.url, { headers, responseType: "stream" });
    res.setHeader("Content-Type", media.mime_type || "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=86400");
    archivo.data.pipe(res);
  } catch (error) {
    // Meta conserva los archivos recibidos solo por un tiempo limitado
    const msg = error.response?.status === 404 ? "El archivo ya no está disponible en WhatsApp" : `${error}`;
    res.status(error.response?.status === 404 ? 404 : 500).json({
      ok: false,
      msg,
    });
  }
};

module.exports = {
  verificarWebhookWsp,
  recibirMensajeWsp,
  getChatsWsp,
  getMensajesxChat,
  getMediaWsp,
};
