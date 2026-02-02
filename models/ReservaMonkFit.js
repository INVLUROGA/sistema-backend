const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Cliente } = require("../models/Usuarios");
const { Parametros } = require("../models/Parametros");

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
      allowNull: false,
    },
    id_pgm: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_estado_param: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    codigo_reserva: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    fechaP: {
      type: DataTypes.DATE,
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: db.literal("GETDATE()"),
    },
    monto_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    flag: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "tb_reservaMonkFit",
    timestamps: false,
  },
);

ReservaMonkFit.belongsTo(Cliente, {
  as: "cliente",
  foreignKey: "id_cli",
});

ReservaMonkFit.belongsTo(Parametros, {
  as: "estado",
  foreignKey: "id_estado_param",
});

module.exports = ReservaMonkFit;
