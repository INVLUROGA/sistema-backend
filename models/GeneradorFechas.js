const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

const GeneradorFechas = db.define(
  "tb_GeneradorFechas",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre_fecha: {
      type: DataTypes.STRING(500),
    },
    fecha_inicio: {
      type: DataTypes.DATEONLY,
    },
    fecha_fin: {
      type: DataTypes.DATEONLY,
    },
    orden: {
      type: DataTypes.INTEGER,
    },
    entidad: {
      type: DataTypes.STRING,
    },
    id_empresa: {
      type: DataTypes.INTEGER,
      defaultValue: true,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    flag: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  { tableName: "tb_GeneradorFechas" }
);

GeneradorFechas.sync()
  .then(() => {
    console.log("La tabla GeneradorFechas ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: GeneradorFechas",
      error
    );
  });

module.exports = {
  GeneradorFechas,
};
