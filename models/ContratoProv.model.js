const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Proveedor } = require("./Proveedor");
const { ImagePT } = require("./Image");
const { Penalidad } = require("./Penalidad");
const { Parametros_zonas } = require("./Parametros");
const { Gastos } = require("./GastosFyV");

const ContratoProv = db.define("prov_contratos", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  cod_trabajo: {
    type: DataTypes.STRING(10),
  },
  id_prov: {
    type: DataTypes.INTEGER,
  },
  fecha_inicio: {
    type: DataTypes.STRING(24),
  },
  fecha_fin: {
    type: DataTypes.STRING(24),
  },
  hora_fin: {
    type: DataTypes.TIME,
  },
  penalidad_porcentaje: {
    type: DataTypes.DECIMAL(10, 2),
  },
  penalidad_fijo: {
    type: DataTypes.DECIMAL(10, 2),
  },
  monto_contrato: {
    type: DataTypes.DECIMAL(10, 2),
  },
  mano_obra_soles: {
    type: DataTypes.DECIMAL(10, 2),
  },
  mano_obra_dolares: {
    type: DataTypes.DECIMAL(10, 2),
  },
  observacion: {
    type: DataTypes.STRING(660),
  },
  tipo_moneda: {
    type: DataTypes.STRING(4),
  },
  estado_contrato: {
    type: DataTypes.INTEGER,
  },
  uid_presupuesto: {
    type: DataTypes.STRING,
  },
  uid_contrato: {
    type: DataTypes.STRING,
  },
  uid_compromisoPago: {
    type: DataTypes.STRING,
  },
  id_empresa: {
    type: DataTypes.INTEGER,
  },
  id_zona: {
    type: DataTypes.INTEGER,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
ContratoProv.hasOne(Proveedor, {
  sourceKey: "id_prov",
  foreignKey: "id",
  as: "prov",
});

ContratoProv.hasMany(Penalidad, {
  sourceKey: "id",
  foreignKey: "id_contrato",
  as: "provPenalidad",
});
ContratoProv.hasOne(Parametros_zonas, {
  sourceKey: "id_zona",
  foreignKey: "id",
  as: "zona",
});
ContratoProv.hasMany(Gastos, {
  sourceKey: "id",
  foreignKey: "id_contrato_prov",
  as: "gasto",
});
ContratoProv.sync()
  .then(() => {
    console.log("La tabla ContratoProv ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: ContratoProv",
      error
    );
  });
module.exports = {
  ContratoProv,
};
