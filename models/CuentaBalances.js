const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Proveedor } = require("./Proveedor");
const { Parametros } = require("./Parametros");

const CuentaBalance = db.define(
  "tb_cuentaBalance",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    tipo: {
      type: DataTypes.STRING(30),
    },
    id_concepto: {
      type: DataTypes.INTEGER,
    },
    monto: {
      type: DataTypes.DECIMAL(10, 2),
    },
    moneda: {
      type: DataTypes.STRING(5),
    },
    fecha_comprobante: {
      type: DataTypes.DATE,
    },
    id_prov: {
      type: DataTypes.INTEGER,
    },
    id_banco: {
      type: DataTypes.INTEGER,
    },
    n_operacion: {
      type: DataTypes.STRING(50),
    },
    descripcion: {
      type: DataTypes.STRING(490),
    },
    id_empresa: {
      type: DataTypes.INTEGER,
    },
    flag: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "tb_cuentaBalance",
  }
);

CuentaBalance.belongsTo(Proveedor, {
  foreignKey: "id_prov",
  targetKey: "id",
  // as: "proveedor", // Opcional: alias para la relación
});

CuentaBalance.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_concepto",
  as: "concepto",
});

CuentaBalance.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_banco",
  as: "banco",
});

// Sincroniza el modelo con la base de datos (crea la tabla si no existe)
CuentaBalance.sync()
  .then(() => {
    console.log("La tabla tb_cuentaBalance ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });
module.exports = {
  CuentaBalance,
};
