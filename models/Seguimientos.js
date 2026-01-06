const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Cliente } = require("./Usuarios");
const {
  Venta,
  detalle_cambioPrograma,
  detalleVenta_membresias,
} = require("./Venta");
const { ExtensionMembresia } = require("./ExtensionMembresia");

const Seguimiento = db.define("tb_seguimiento", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_membresia: {
    type: DataTypes.INTEGER,
  },
  id_cambio: {
    type: DataTypes.INTEGER,
  },
  id_extension: {
    type: DataTypes.INTEGER,
  },
  sesiones_pendientes: {
    type: DataTypes.INTEGER,
  },
  fecha_vencimiento: {
    type: DataTypes.DATE,
  },
  status_periodo: {
    type: DataTypes.STRING(10),
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
Seguimiento.hasOne(detalleVenta_membresias, {
  foreignKey: "id",
  sourceKey: "id_membresia",
  as: "venta",
});
Seguimiento.hasOne(detalle_cambioPrograma, {
  foreignKey: "id",
  sourceKey: "id_cambio",
  as: "cambioPgm",
});

Seguimiento.hasOne(ExtensionMembresia, {
  foreignKey: "id",
  sourceKey: "id_extension",
  as: "extension",
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
