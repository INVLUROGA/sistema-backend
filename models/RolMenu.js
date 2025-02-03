const { db } = require("../database/sequelizeConnection");


/**
 SECCIONES
 MODULOS
 */
const RolUser = db.define("rol_secciones", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  label: {
    type: DataTypes.STRING,
  },
  url: {
    type: DataTypes.STRING,
  },
  isTitle: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  icon: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
