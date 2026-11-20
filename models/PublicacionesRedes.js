const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

// Publicaciones de cada red social con sus likes, comentarios y compartidos.
// id_red -> tb_parametros (entidad_param "redes-sociales", grupo_param "seguidores"):
// 2064 FACEBOOK, 2065 INSTAGRAM, 2066 TIKTOK
const PublicacionesRedes = db.define("tb_publicaciones_redes", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_red: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  // id de la publicacion en la red (Meta): evita guardar la misma publicacion dos veces
  id_publicacion: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  // fecha y hora de publicacion (UTC)
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  tipo: {
    type: DataTypes.STRING(50),
  },
  // texto de la publicacion (caption en Instagram, message en Facebook)
  publicacion: {
    type: DataTypes.TEXT,
  },
  n_likes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  n_comentarios: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  n_compartidos: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

PublicacionesRedes.sync()
  .then(() => {
    console.log("La tabla tb_publicaciones_redes ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error,
    );
  });

module.exports = {
  PublicacionesRedes,
};
