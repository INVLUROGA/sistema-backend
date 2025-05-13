const { DataTypes } = require("sequelize");
const { db } = require("../../database/sequelizeConnection");
const { Parametros } = require("../Parametros");

const Canjes = db.define("tb_canjes", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nombres: {
    type: DataTypes.STRING(250),
  },
  apellidos: {
    type: DataTypes.STRING(350),
  },
  fecha: {
    type: DataTypes.DATE,
  },
  profesion: {
    type: DataTypes.STRING,
  },
  servicios: {
    type: DataTypes.STRING,
  },
  precio_venta: {
    type: DataTypes.DECIMAL(10, 2),
  },
  seguidores: {
    type: DataTypes.STRING(20),
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  id_empresa: {
    type: DataTypes.INTEGER,
  },
  cant_public: {
    type: DataTypes.STRING(3),
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  estado: {
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

Canjes.sync()
  .then(() => {
    console.log("La tabla Canjes ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: Canjes",
      error
    );
  });

module.exports = {
  Canjes,
};
