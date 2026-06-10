const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { ParametroGastos } = require("./GastosFyV");

const FlujoCaja = db.define("tb_flujocaja", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_registro: {
    type: DataTypes.INTEGER,
  },
  tipo_movimiento: {
    type: DataTypes.STRING,
    defaultValue: "INGRESO",
  },
  id_concepto: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  fecha_comprobante: {
    type: DataTypes.DATE,
    defaultValue: new Date(),
  },
  fecha_pago: {
    type: DataTypes.DATE,
    defaultValue: new Date(),
  },
  moneda: {
    type: DataTypes.STRING,
    defaultValue: "PEN",
  },
  monto: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },
  tc: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },
  id_estado: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  id_empresa: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

FlujoCaja.sync()
  .then(() => {
    console.log("La tabla FlujoCaja ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error,
    );
  });

FlujoCaja.hasOne(ParametroGastos, {
  foreignKey: "id",
  sourceKey: "id_concepto",
});
FlujoCaja.belongsTo(FlujoCaja, {
  foreignKey: "id",
  targetKey: "id_concepto",
});

module.exports = {
  FlujoCaja,
};
