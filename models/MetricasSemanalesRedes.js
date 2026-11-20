const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

// Metricas de Facebook e Instagram en bloques de 7 dias desde el primer post de cada cuenta.
// Lo llena registrarMetricasSemanalesMeta (middlewares/Redes/MetricasSemanalesMeta.js).
// id_red -> tb_parametros (entidad_param "redes-sociales", grupo_param "seguidores"): 2064 FACEBOOK, 2065 INSTAGRAM
// seguidores: total al final de la semana. seguidores_ganados / seguidores_perdidos: altas y bajas en la semana.
//   Null si Meta no tiene el dato (Instagram solo da el ultimo año).
// posts / likes / comentarios: de los posts publicados en la semana, con los likes y comentarios que tienen hoy.
const MetricasSemanalesRedes = db.define(
  "tb_metricas_semanales_redes",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_red: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    semana_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    semana_fin: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    seguidores: {
      type: DataTypes.INTEGER,
    },
    seguidores_ganados: {
      type: DataTypes.INTEGER,
    },
    seguidores_perdidos: {
      type: DataTypes.INTEGER,
    },
    posts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    flag: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  { tableName: "tb_metricas_semanales_redes" },
);

// sync() sin alter: en SQL Server, alter falla con las columnas que tienen DEFAULT
const sincronizado = MetricasSemanalesRedes.sync()
  .then(() => {
    console.log("La tabla tb_metricas_semanales_redes ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: MetricasSemanalesRedes",
      error,
    );
  });

module.exports = {
  MetricasSemanalesRedes,
  sincronizado,
};
