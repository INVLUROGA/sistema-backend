const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

const ReservaMonkFit = db.define(
  "tb_reservaMonkFit",
  {
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
  },
  {
    tableName: "tb_cita",
  }
);