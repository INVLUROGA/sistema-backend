const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

// Registro de los mensajes "membresía por finalizar" enviados por WhatsApp.
// El índice único (tipo, telefono, fecha_vencimiento) garantiza que cada teléfono
// reciba cada aviso UNA sola vez, aunque el cron corra en varios servidores
// (Azure + local), se reinicie la app o dos clientes compartan el teléfono.
const MensajeMembresia = db.define(
  "tb_mensaje_membresia",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    tipo: {
      type: DataTypes.STRING(20), // "1-dia" | "1-semana"
      allowNull: false,
    },
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    fecha_vencimiento: {
      type: DataTypes.DATEONLY, // día de vencimiento en Perú (YYYY-MM-DD)
      allowNull: false,
    },
    id_cli: {
      type: DataTypes.INTEGER,
    },
    estado: {
      type: DataTypes.STRING(15), // "pendiente" | "enviado" | "error"
      defaultValue: "pendiente",
    },
    detalle: {
      type: DataTypes.STRING(500),
    },
  },
  {
    tableName: "tb_mensaje_membresia",
    indexes: [
      {
        unique: true,
        name: "UX_mensaje_membresia_tipo_telefono_vencimiento",
        fields: ["tipo", "telefono", "fecha_vencimiento"],
      },
    ],
  },
);

MensajeMembresia.sync()
  .then(() => {
    console.log("La tabla MensajeMembresia ha sido sync o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error,
    );
  });

module.exports = {
  MensajeMembresia,
};
