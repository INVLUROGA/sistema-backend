const { db } = require("../database/sequelizeConnection");
const { DataTypes } = require("sequelize");
const { Usuario } = require("./Usuarios");
const { Parametros } = require("./Parametros");

const Comentario = db.define("tb_comentarios", {
  id_comentario: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  uid: {
    type: DataTypes.STRING,
  },
  uid_location: {
    type: DataTypes.STRING,
  },
  uid_usuario: {
    type: DataTypes.STRING,
  },
  comentario_com: {
    type: DataTypes.STRING(360),
  },
  fec_registro: {
    type: DataTypes.DATE,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

Usuario.hasMany(Comentario, {
  foreignKey: "uid_usuario",
  sourceKey: "uid",
});
Comentario.belongsTo(Usuario, {
  foreignKey: "uid_usuario",
  targetKey: "uid",
});
const Actividad = db.define("auth_actividad", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  uid: {
    type: DataTypes.STRING,
  },
  uid_user: {
    type: DataTypes.STRING,
  },
  observacion_activity: {
    type: DataTypes.STRING,
  },
});
const ContactoEmergencia = db.define("tb_contactoEmergencia", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  entidad: {
    type: DataTypes.STRING(100),
  },
  uid_location: {
    type: DataTypes.STRING(150),
  },
  id_tipo_pariente: {
    type: DataTypes.INTEGER,
  },
  nombres: {
    type: DataTypes.STRING(150),
  },
  telefono: {
    type: DataTypes.STRING(50),
  },
  email: {
    type: DataTypes.STRING(150),
  },
  comentario: {
    type: DataTypes.STRING(350),
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const MensajeEnviados = db.define("tb_mensajes_enviados", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  from: {
    type: DataTypes.STRING,
  },
  to: {
    type: DataTypes.STRING,
  },
  body: {
    type: DataTypes.STRING,
  },
  priority: {
    type: DataTypes.STRING(360),
  },
  fec_registro: {
    type: DataTypes.DATE,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

ContactoEmergencia.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_tipo_pariente",
  as: "tipo_pariente",
});

Comentario.sync()
  .then(() => {
    console.log("La tabla Comentario ha sido drop o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });

ContactoEmergencia.sync()
  .then(() => {
    console.log("La tabla ContactoEmergencia ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });
module.exports = {
  Comentario,
  ContactoEmergencia,
  Actividad,
};
