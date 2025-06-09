const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

const TipoCambio = db.define("tb_tipocambio", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  precio_compra: {
    type: DataTypes.STRING(6),
  },
  precio_venta: {
    type: DataTypes.STRING(6),
  },
  moneda: {
    type: DataTypes.STRING(5),
  },
  fecha: {
    type: DataTypes.STRING(45),
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const TipoDeCambio = db.define("tb_tipodecambio", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  precio_compra: {
    type: DataTypes.DECIMAL(10, 2),
  },
  precio_venta: {
    type: DataTypes.DECIMAL(10, 2),
  },
  monedaOrigen: {
    type: DataTypes.STRING(5),
  },
  monedaDestino: {
    type: DataTypes.STRING(5),
  },
  fecha: {
    type: DataTypes.DATE,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

TipoCambio.sync()
  .then(() => {
    console.log("La tabla TipoCambio ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: TipoCambio",
      error
    );
  });
TipoDeCambio.sync()
  .then(() => {
    console.log("La tabla TipoDeCambio ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: TipoCambio",
      error
    );
  });

module.exports = {
  TipoCambio,
  TipoDeCambio,
};
