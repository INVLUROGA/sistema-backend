const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

const Penalidad = db.define(
  "prov_penalidad",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_contrato: {
      type: DataTypes.INTEGER,
    },
    id_tipo_penalidad: {
      type: DataTypes.INTEGER,
    },
    monto: {
      type: DataTypes.DECIMAL(10, 2),
    },
    fecha: {
      type: DataTypes.DATE,
    },
    observacion: {
      type: DataTypes.STRING(450),
    },
    flag: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  { tableName: "prov_penalidad" }
);

Penalidad.sync()
  .then(() => {
    console.log("La tabla Penalidad ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: Penalidad",
      error
    );
  });
module.exports = {
  Penalidad,
};
