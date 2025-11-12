const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Empleado } = require("./Usuarios");

const TiemposEspeciales = db.define("rrhh_tiemposEspeciales", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  entidad: {
    type: DataTypes.STRING(130),
  },
  id_colaborador: {
    type: DataTypes.INTEGER,
  },
  fechaDesde: {
    type: DataTypes.DATE,
  },
  fechaHasta: {
    type: DataTypes.DATE,
  },
  conGoceSueldo: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  observacion: {
    type: DataTypes.STRING(560),
  },
  id_tipo: {
    type: DataTypes.INTEGER,
  },
  minutos: {
    type: DataTypes.INTEGER,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
TiemposEspeciales.hasOne(Empleado,{
    foreignKey: "id_empl",
  sourceKey: "id_colaborador",
  as: "_empl",
})
TiemposEspeciales.sync()
  .then(() => {
    console.log("La tabla TiemposEspeciales ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });
module.exports = {
  TiemposEspeciales,
};
