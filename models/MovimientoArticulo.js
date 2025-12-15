const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const MovimientoArticulo = db.define("articulo_movimiento", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  cantidad: {
    type: DataTypes.INTEGER,
  },
  id_articulo: {
    type: DataTypes.INTEGER,
  },
  id_lugar_destino: {
    type: DataTypes.INTEGER,
  },
  fechaCambio: {
    type: DataTypes.DATE,
  },
  movimiento: {
    type: DataTypes.STRING(20),
  },
  observacion: {
    type: DataTypes.STRING(420),
  },
  id_motivo: {
    type: DataTypes.INTEGER,
  },
  id_empresa: {
    type: DataTypes.INTEGER,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

MovimientoArticulo.sync()
  .then(() => {
    console.log("La tabla MovimientoArticulo ha sido sync o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });

module.exports = {
  MovimientoArticulo,
};
