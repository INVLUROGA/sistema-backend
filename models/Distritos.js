const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Cliente, Empleado } = require("./Usuarios");

const Distritos = db.define("tb_distritos", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  ubigeo: {
    type: DataTypes.STRING(10),
  },
  distrito: {
    type: DataTypes.STRING(45),
  },
  provincia_id: {
    type: DataTypes.INTEGER,
  },
  department_id: {
    type: DataTypes.INTEGER,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

Cliente.hasOne(Distritos, {
  foreignKey: "ubigeo",
  sourceKey: "ubigeo_distrito_cli",
  // as: "parametro_comprobante",
});

Empleado.hasOne(Distritos, {
  foreignKey: "ubigeo",
  sourceKey: "ubigeo_distrito_empl",
  // as: "parametro_comprobante",
});
Distritos.sync()
  .then(() => {
    console.log("La tabla Distritos ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });
module.exports = {
  Distritos,
};
