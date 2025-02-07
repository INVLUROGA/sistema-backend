const { DataTypes } = require("sequelize");
const { db } = require("../../database/sequelizeConnection");
const { Parametros } = require("../Parametros");

const ServiciosCircus = db.define("circus_servicios", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nombre_servicio: {
    type: DataTypes.STRING(5),
  },
  descripcion: {
    type: DataTypes.STRING(300),
  },
  id_categoria: {
    type: DataTypes.INTEGER,
  },
  id_subCategoria: {
    type: DataTypes.INTEGER,
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
  },
  duracion: {
    type: DataTypes.INTEGER,
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

ServiciosCircus.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_subCategoria",
});

ServiciosCircus.sync()
  .then(() => {
    console.log("La tabla ServiciosCircus ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: ServiciosCircus",
      error
    );
  });

module.exports = {
  ServiciosCircus,
};
