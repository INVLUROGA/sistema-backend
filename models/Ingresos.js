const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Parametros } = require("./Parametros");
const { ParametroGastos } = require("./GastosFyV");
const { Proveedor } = require("./Proveedor");
const Ingreso = db.define("tb_ingreso", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  id_gasto: {
    type: DataTypes.INTEGER,
  },
  moneda: {
    type: DataTypes.STRING(10),
  },
  monto: {
    type: DataTypes.DECIMAL(10, 2),
  },
  id_tipo_comprobante: {
    type: DataTypes.INTEGER,
  },
  n_comprabante: {
    type: DataTypes.STRING(150),
  },
  fec_registro: {
    type: DataTypes.DATE,
  },
  fec_comprobante: {
    type: DataTypes.DATE,
  },
  fec_pago: {
    type: DataTypes.DATE,
  },
  id_forma_pago: {
    type: DataTypes.INTEGER,
  },
  id_banco: {
    type: DataTypes.INTEGER,
  },
  id_tarjeta: {
    type: DataTypes.INTEGER,
  },
  n_operacion: {
    type: DataTypes.STRING(100),
  },
  descripcion: {
    type: DataTypes.STRING(600),
  },
  id_prov: {
    type: DataTypes.INTEGER,
  },
  id_empresa: {
    type: DataTypes.INTEGER,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

Ingreso.belongsTo(Proveedor, {
  foreignKey: "id_prov",
  targetKey: "id",
  // as: "proveedor", // Opcional: alias para la relación
});

Ingreso.hasOne(ParametroGastos, {
  foreignKey: "id",
  sourceKey: "id_gasto",
});

Ingreso.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_forma_pago",
  as: "formaPago",
});

Ingreso.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_banco",
  as: "banco",
});

Ingreso.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_tarjeta",
  as: "tarjeta",
});

Ingreso.sync()
  .then(() => {
    console.log("La tabla Aportes ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });
module.exports = {
  Ingreso,
};
