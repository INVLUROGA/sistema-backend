const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { ImagePT } = require("./Image");

const Actas = db.define("tb_actas", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  titulo: {
    type: DataTypes.STRING(200),
  },
  observacion: {
    type: DataTypes.STRING(4000),
  },
  // une el acta con sus archivos: tb_image.uid_location = tb_actas.uid_documento
  uid_documento: {
    type: DataTypes.STRING(100),
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

Actas.hasMany(ImagePT, {
  foreignKey: "uid_location",
  sourceKey: "uid_documento",
  as: "archivos",
  constraints: false,
});

Actas.sync()
  .then(async () => {
    // la tabla ya existia sin uid_documento: se agrega la columna si falta
    const qi = db.getQueryInterface();
    const columnas = await qi.describeTable(Actas.getTableName());
    if (!columnas.uid_documento) {
      await qi.addColumn(Actas.getTableName(), "uid_documento", { type: DataTypes.STRING(100), allowNull: true });
      console.log("Columna uid_documento agregada a tb_actas.");
    }
    console.log("La tabla Actas ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error("Error al sincronizar el modelo Actas:", error);
  });

module.exports = {
  Actas,
};
