const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

const DiasNoLaborables = db.define("tb_diasNoLaborables", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  entidad: {
    type: DataTypes.STRING(130),
  },
  id_tipo: {
    type: DataTypes.INTEGER,
  },
  id_colaborador: {
    type: DataTypes.INTEGER,
  },
  nombre: {
    type: DataTypes.STRING(130),
  },
  observacion: {
    type: DataTypes.STRING(360),
  },
  fecha: {
    type: DataTypes.DATE,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

DiasNoLaborables.sync()
  .then(() => {
    console.log("La tabla DiasNoLaborables ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });
module.exports = {
  DiasNoLaborables,
};
