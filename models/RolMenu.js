const { db } = require("../database/sequelizeConnection");

/**
 SECCIONES
 MODULOS
 */
const MenuItem  = db.define("rol_MenuItem", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isTitle: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "MenuItems",
      key: "id",
    },
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

// Para relaciones recursivas (menús con submenús)
MenuItem.hasMany(MenuItem, { as: "children", foreignKey: "parentId" });
MenuItem.belongsTo(MenuItem, { as: "parent", foreignKey: "parentId" });
