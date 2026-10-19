const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

// Mensajes de WhatsApp que llegan por el webhook de WhatsApp Cloud API (Meta).
// id_mensaje es el wamid de Meta: el índice único evita guardar dos veces el mismo
// mensaje cuando Meta reintenta el webhook.
const MensajeWsp = db.define(
  "tb_mensaje_wsp",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_mensaje: {
      type: DataTypes.STRING(150), // wamid.xxx
      allowNull: false,
    },
    // wa_id del cliente (ej. 51999999999): agrupa los mensajes por conversación
    chat: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    // número del negocio que recibió/envió el mensaje (display_phone_number)
    numero_negocio: {
      type: DataTypes.STRING(30),
    },
    nombre: {
      type: DataTypes.STRING(150), // profile.name del cliente
    },
    enviado_por_mi: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // text | image | video | audio | document | sticker | location | contacts |
    // interactive | button | reaction | saliente (enviado por API: solo se conoce su estado)
    tipo: {
      type: DataTypes.STRING(30),
    },
    body: {
      type: DataTypes.TEXT,
    },
    id_media: {
      type: DataTypes.STRING(100), // id del archivo en Meta, se descarga con /api/wsp/media/:id_media
    },
    mime_type: {
      type: DataTypes.STRING(100),
    },
    nombre_archivo: {
      type: DataTypes.STRING(255),
    },
    estado: {
      type: DataTypes.STRING(20), // sent | delivered | read | failed (solo mensajes enviados)
    },
    error: {
      type: DataTypes.STRING(500),
    },
    fecha: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "tb_mensaje_wsp",
    indexes: [
      { unique: true, name: "UX_mensaje_wsp_id_mensaje", fields: ["id_mensaje"] },
      { name: "IX_mensaje_wsp_chat_fecha", fields: ["chat", "fecha"] },
    ],
  },
);

MensajeWsp.sync()
  .then(() => {
    console.log("La tabla MensajeWsp ha sido sync o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error,
    );
  });

module.exports = {
  MensajeWsp,
};
