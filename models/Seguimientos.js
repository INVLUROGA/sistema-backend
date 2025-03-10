const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Cliente } = require("./Usuarios");
const {
  Venta,
  detalle_cambioPrograma,
  detalleVenta_membresias,
} = require("./Venta");

const Seguimiento = db.define("tb_seguimiento", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  uid_cli: {
    type: DataTypes.STRING,
  },
  id_venta: {
    type: DataTypes.INTEGER,
  },
  id_cambio: {
    type: DataTypes.INTEGER,
  },
  id_membresia_extension: {
    type: DataTypes.INTEGER,
  },
  // id_pgm: {
  //   type: DataTypes.INTEGER,
  // },
  // id_horario: {
  //   type: DataTypes.INTEGER,
  // },
  sesiones_pendientes: {
    type: DataTypes.INTEGER,
  },
  fecha_vencimiento: {
    type: DataTypes.STRING(10),
  },
  status_periodo: {
    type: DataTypes.STRING(10),
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
Seguimiento.hasOne(Cliente, {
  foreignKey: "uid",
  sourceKey: "uid_cli",
  as: "cliente",
});
Seguimiento.hasOne(detalleVenta_membresias, {
  foreignKey: "id_venta",
  sourceKey: "id_venta",
  as: "venta",
});
Seguimiento.hasOne(detalle_cambioPrograma, {
  foreignKey: "id",
  sourceKey: "id_cambio",
  as: "cambioPgm",
});

Seguimiento.sync()
  .then(() => {
    console.log("La tabla Seguimiento ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });

module.exports = {
  Seguimiento,
};
