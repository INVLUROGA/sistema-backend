const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const ClienteMonkeyFit = require("./ClienteMonkeyFit");
const { Parametros } = require("./Parametros");

const ReservaMonkFit = db.define(
  "ReservaMonkFit",
  {
    id:              { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_cliente_mf:   { type: DataTypes.INTEGER, allowNull: false },
    id_pgm:          { type: DataTypes.INTEGER, allowNull: false },
    id_estado_param: { type: DataTypes.INTEGER, allowNull: true },
    codigo_reserva:  { type: DataTypes.STRING(50), allowNull: true },
    fecha:           { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    monto_total:     { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    flag:            { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "tb_reservaMonkFit",
    schema: "dbo",
    freezeTableName: true,
    timestamps: false, 
  }
);

const recomputeCantReservas = async (id_cliente_mf) => {
  const total = await ReservaMonkFit.count({ where: { id_cliente_mf, flag: true } });
  await ClienteMonkeyFit.update({ cant_reservas: total }, { where: { id_cliente_mf } });
};
ReservaMonkFit.afterCreate(async (reserva) => recomputeCantReservas(reserva.id_cliente_mf));
ReservaMonkFit.afterUpdate(async (reserva) => recomputeCantReservas(reserva.id_cliente_mf));

// Relaciones
ReservaMonkFit.belongsTo(ClienteMonkeyFit, {
  foreignKey: "id_cliente_mf",
  targetKey: "id_cliente_mf",
  as: "cliente",
});

if (Parametros) {
  ReservaMonkFit.belongsTo(Parametros, {
    foreignKey: "id_estado_param",
    targetKey: "id_param",
    as: "estado",
  });
}

module.exports = ReservaMonkFit;
