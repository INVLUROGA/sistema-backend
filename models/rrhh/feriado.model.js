const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

const Feriado = db.define("tb_feriados", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING(130),
  },
  observacion: {
    type: DataTypes.STRING(260),
  },
  fecha: {
    type: DataTypes.DATE,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

module.exports = {
  Feriado,
};
