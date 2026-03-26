const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Usuario } = require("./Usuarios");
const { Parametros, Parametros_3 } = require("./Parametros");

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

const AlertasUsuario = db.define("tb_alertaUsuario", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_grupo_usuarios: {
    type: DataTypes.INTEGER,
  },
  id_tipo_alerta: {
    type: DataTypes.INTEGER,
  },
  mensaje: {
    type: DataTypes.STRING(950),
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

const TerminologiaAlerta = db.define("terminologia_alerta", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nombre_tipo_alerta: {
    type: DataTypes.STRING(240),
    defaultValue: "",
  },
  cadaTiempo: {
    type: DataTypes.INTEGER,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

Usuario.hasMany(Auditoria, { foreignKey: "id_user" });
Auditoria.belongsTo(Usuario, { foreignKey: "id_user" });
AlertasUsuario.hasMany(Parametros_3, {
  foreignKey: "id",
  targetKey: "id_grupo_usuarios",
  as: "alerta_grupo",
});

AlertasUsuario.belongsTo(TerminologiaAlerta, {
  foreignKey: "id_tipo_alerta",
  targetKey: "id",
  as: "alerta_tipo",
});

Auditoria.sync()
  .then(() => {
    console.log("La tabla Auditoria ha sido sync o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error,
    );
  });

AlertasUsuario.sync()
  .then(() => {
    console.log("La tabla AlertasUsuario ha sido sync o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error,
    );
  });

TerminologiaAlerta.sync()
  .then(() => {
    console.log("La tabla TerminologiaAlerta ha sido sync o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error,
    );
  });

module.exports = {
  Auditoria,
  AlertasUsuario,
  TerminologiaAlerta,
};
