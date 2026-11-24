const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

// Medidas de composicion corporal del cliente por fecha (una fila por evaluacion).
// id_cli -> tb_clientes.id_cli
const HistorialNutricional = db.define(
  "tb_historial_nutricional",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    id_cli: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    peso: {
      type: DataTypes.DECIMAL(10, 2),
    },
    talla: {
      type: DataTypes.DECIMAL(10, 2),
    },
    // masa muscular esqueletica
    mme: {
      type: DataTypes.DECIMAL(10, 2),
    },
    masa_magra_corporal: {
      type: DataTypes.DECIMAL(10, 2),
    },
    tasa_metabolica_basal: {
      type: DataTypes.DECIMAL(10, 2),
    },
    relacion_cintura_cadera: {
      type: DataTypes.DECIMAL(10, 2),
    },
    nivel_grasa_visceral: {
      type: DataTypes.DECIMAL(10, 2),
    },
    grado_obecidad: {
      type: DataTypes.DECIMAL(10, 2),
    },
    flag: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    // sin esto Sequelize la crea como "tb_historial_nutricionals"
    tableName: "tb_historial_nutricional",
  },
);

HistorialNutricional.sync()
  .then(() => {
    console.log("La tabla tb_historial_nutricional ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error,
    );
  });

module.exports = {
  HistorialNutricional,
};
