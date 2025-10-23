const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Parametros } = require("./Parametros");  

const ReservaMonkFit = db.define(
  "tb_reservaMonkFit",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_cli: { type: DataTypes.INTEGER, allowNull: false },
    id_pgm: { type: DataTypes.INTEGER, allowNull: false },
    id_estado_param: { type: DataTypes.INTEGER, allowNull: true },
    fecha: { type: DataTypes.DATE, allowNull: false },
    flag: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: "tb_reservaMonkFit", timestamps: true }
);

ReservaMonkFit.belongsTo(Parametros, {
  tableName:"tb_parametros",
  as: "estado",
  foreignKey: "id_estado_param",
  targetKey: "id_param",
});

module.exports = ReservaMonkFit;
