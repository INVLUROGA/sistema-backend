const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

const ReservaMonkFit = db.define("tb_reservaMonkFit", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_cli: {
    type: DataTypes.INTEGER,
  },
  id_pgm: {
    type: DataTypes.INTEGER,
  },
  id_estado: {
    type: DataTypes.DATE,
  },
  fecha: {
    type: DataTypes.DATE,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

ReservaMonkFit.sync()
  .then(() => {
    console.log("La tabla ReservaMonkFit ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });

module.exports = {
  ReservaMonkFit,
};
