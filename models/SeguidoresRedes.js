const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

// Seguidores de cada red social por dia.
// id_red -> tb_parametros (entidad_param "redes-sociales", grupo_param "seguidores"):
// FACEBOOK, INSTAGRAM, TIKTOK
const SeguidoresRedes = db.define("tb_seguidores_redes", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_red: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  seguidores: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  likes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  comentarios: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});


SeguidoresRedes.sync()
  .then(() => {
    console.log("La tabla tb_seguidores_redes ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error,
    );
  });

module.exports = {
  SeguidoresRedes,
};
