const { DataTypes } = require("sequelize");
const { db } = require("../../database/sequelizeConnection");

const VentaTem = db.define("tb_ventaTemporal", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_item: {
    type: DataTypes.INTEGER,
  },
  fecha: {
    type: DataTypes.DATE,
  },
  comprobante: {
    type: DataTypes.STRING(60),
  },
  marca: {
    type: DataTypes.STRING(60),
  },
  num_comp: {
    type: DataTypes.STRING(30),
  },
  tipo_cliente: {
    type: DataTypes.STRING(30),
  },
  tipo_doc: {
    type: DataTypes.STRING(30),
  },
  num_doc: {
    type: DataTypes.STRING(30),
  },
  nombre_cliente: {
    type: DataTypes.STRING(250),
  },
  clase: {
    type: DataTypes.STRING(30),
  },
  proser: {
    type: DataTypes.STRING(300),
  },
  empleado: {
    type: DataTypes.STRING(300),
  },
  cantidad: {
    type: DataTypes.INTEGER,
  },
  tipo_pago: {
    type: DataTypes.STRING(200),
  },
  categoria: {
    type: DataTypes.STRING(100),
  },
  pago_monto: {
    type: DataTypes.DECIMAL(10, 2),
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

// Canjes.hasOne(Parametros, {
//     foreignKey: "id_param",
//     sourceKey: "id_servicio",
//   });
//   Canjes.hasOne(Parametros, {
//   foreignKey: "id_param",
//   sourceKey: "id_profesion",
// });

VentaTem.sync()
  .then(() => {
    console.log("La tabla VentaTem ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: VentaTem",
      error
    );
  });

module.exports = {
  VentaTem,
};
