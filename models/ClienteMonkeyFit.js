const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

const ClienteMonkeyFit = db.define(
  "ClienteMonkeyFit",
  {
    id_cliente_mf: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre_cli:    { type: DataTypes.STRING(150), allowNull: false },
    apellido_cli:  { type: DataTypes.STRING(150), allowNull: false },
    email_cli:     { type: DataTypes.STRING(200), allowNull: true },
    telefono_cli:  { type: DataTypes.STRING(100), allowNull: true },
    cant_reservas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    flag:          { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt:     { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt:     { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "clienteMonkeyFit",
    schema: "dbo",
    freezeTableName: true,
    timestamps: true, 
  }
);

module.exports = ClienteMonkeyFit;
