const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Usuario } = require("./Usuarios");

const Auditoria = db.define("tb_auditoria", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_user: {
    type: DataTypes.INTEGER,
  },
  ip_user: {
    type: DataTypes.STRING(40),
  },
  accion: {
    type: DataTypes.INTEGER,
  },
  observacion: {
    type: DataTypes.STRING(2000),
  },
  fecha_audit: {
    type: DataTypes.DATE,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const AuditoriaNew = db.define("tb_auditoria_form", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_user: {
    type: DataTypes.INTEGER,
  },
  ip_user: {
    type: DataTypes.STRING(40),
  },
  accion: {
    type: DataTypes.INTEGER,
  },
  arrayViejo: {
    type: DataTypes.TEXT("long"),
  },
  arrayNuevo: {
    type: DataTypes.TEXT("long"),
  },
  observacion: {
    type: DataTypes.STRING(2000),
  },
  fecha_audit: {
    type: DataTypes.DATE,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const AlertasUsuario = db.define("tb_alertaUsuario", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_user: {
    type: DataTypes.INTEGER,
  },
  tipo_alerta: {
    type: DataTypes.INTEGER,
  },
  mensaje: {
    type: DataTypes.STRING(450),
  },
  fecha: {
    type: DataTypes.DATE,
  },
  id_estado: {
    type: DataTypes.INTEGER,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

Usuario.hasMany(Auditoria, { foreignKey: "id_user" });
Auditoria.belongsTo(Usuario, { foreignKey: "id_user" });
AlertasUsuario.belongsTo(Usuario, { foreignKey: "id_user" });
Auditoria.sync()
  .then(() => {
    console.log("La tabla Auditoria ha sido sync o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });

AuditoriaNew.sync()
  .then(() => {
    console.log("La tabla AuditoriaNew ha sido sync o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });

AlertasUsuario.sync()
  .then(() => {
    console.log("La tabla AlertasUsuario ha sido sync o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });

module.exports = {
  Auditoria,
  AuditoriaNew,
  AlertasUsuario,
};
