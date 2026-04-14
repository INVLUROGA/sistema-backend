const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Parametros } = require("./Parametros");

const OperadorPago = db.define("tb_operadoresPago", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  fecha_ingreso: {
    type: DataTypes.DATE,
  },
  id_operador: {
    type: DataTypes.INTEGER,
  },
  id_forma_pago: {
    type: DataTypes.INTEGER,
  },
  id_tipo_tarjeta: {
    type: DataTypes.INTEGER,
  },
  id_marca_tarjeta: {
    type: DataTypes.INTEGER,
  },
  id_banco: {
    type: DataTypes.INTEGER,
  },
  cuota: {
    type: DataTypes.INTEGER,
  },
  porcentaje_comision: {
    type: DataTypes.INTEGER,
  },
  estado: {
    type: DataTypes.INTEGER,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

OperadorPago.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_operador",
  as: "OperadorLabel",
});
OperadorPago.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_forma_pago",
  as: "FormaPagoLabel",
});
OperadorPago.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_tipo_tarjeta",
  as: "TipoTarjetaLabel",
});
OperadorPago.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_marca_tarjeta",
  as: "TarjetaLabel",
});
OperadorPago.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_banco",
  as: "BancoLabel",
});

OperadorPago.sync()
  .then(() => {
    console.log("La tabla OperadorPago ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: OperadorPago",
      error,
    );
  });
module.exports = {
  OperadorPago,
};
