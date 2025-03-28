const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

const ModuloItem = db.define("tb_moduloItem", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
  },
  path: {
    type: DataTypes.STRING,
  },
  key: {
    type: DataTypes.STRING,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
const SeccionItem = db.define("tb_seccionItem", {
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
  subtitle_definido: {
    type: DataTypes.STRING(60),
    allowNull: true,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
const ModulosVSseccion = db.define("tb_modulo_vs_seccion", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_modulo: {
    type: DataTypes.INTEGER,
  },
  id_seccion: {
    type: DataTypes.INTEGER,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
const rolesvsModulos = db.define("tb_modulo_vs_role", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_rol: {
    type: DataTypes.INTEGER,
  },
  id_modulo: {
    type: DataTypes.INTEGER,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

// Modelo: Rol (Role)
const Role = db.define("tb_role", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

// Relaciones entre Módulos y Secciones (muchos a muchos)
ModuloItem.belongsToMany(SeccionItem, {
  through: ModulosVSseccion,
  foreignKey: "id_modulo",
  otherKey: "id_seccion",
});
SeccionItem.belongsToMany(ModuloItem, {
  through: ModulosVSseccion,
  foreignKey: "id_seccion",
  otherKey: "id_modulo",
});

// Relaciones entre Roles y Módulos (muchos a muchos)
Role.belongsToMany(ModuloItem, {
  through: rolesvsModulos,
  foreignKey: "id_rol",
  otherKey: "id_modulo",
  as: "modules",
});
ModuloItem.belongsToMany(Role, {
  through: rolesvsModulos,
  foreignKey: "id_modulo",
  otherKey: "id_rol",
  as: "roles",
});

Role.sync()
  .then(() => {
    console.log("La tabla Role ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: Role",
      error
    );
  });

ModuloItem.sync()
  .then(() => {
    console.log("La tabla ModuloItem ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: ModuloItem",
      error
    );
  });

rolesvsModulos
  .sync()
  .then(() => {
    console.log("La tabla rolesvsModulos ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: rolesvsModulos",
      error
    );
  });

ModulosVSseccion.sync()
  .then(() => {
    console.log("La tabla ModulosVSseccion ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: ModulosVSseccion",
      error
    );
  });

SeccionItem.sync()
  .then(() => {
    console.log("La tabla SeccionItem ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: SeccionItem",
      error
    );
  });

module.exports = {
  SeccionItem,
  ModulosVSseccion,
  rolesvsModulos,
  ModuloItem,
  Role,
};
