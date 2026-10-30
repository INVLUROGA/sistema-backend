const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

// Tareas realizadas sobre un lead (tb_prospectoLeads) o, si no es prospecto, sobre un cliente (id_cli).
// id_tarea: 1 Llamar a lead, 2 Seguimiento escrito a lead, 3 Enviar link de pago,
//           4 Agendar visita, 5 Visita agendada
const TareaProspecto = db.define(
  "tb_tareas_prospecto",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_prospecto: {
      type: DataTypes.INTEGER,
    },
    id_cli: {
      type: DataTypes.INTEGER,
    },
    id_tarea: {
      type: DataTypes.INTEGER,
    },
    fecha: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    observacion: {
      type: DataTypes.STRING(990),
    },
    flag: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  { tableName: "tb_tareas_prospecto" },
);

// alter: agrega a la tabla existente las columnas nuevas del modelo (id_cli)
TareaProspecto.sync({ alter: true })
  .then(() => {
    console.log("La tabla TareaProspecto ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: TareaProspecto",
      error,
    );
  });

module.exports = { TareaProspecto };
