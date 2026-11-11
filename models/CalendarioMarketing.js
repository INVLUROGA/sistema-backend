const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { ImagePT } = require("./Image");
const { Parametros } = require("./Parametros");

const CalendarioMarketing = db.define("tb_calendarioMarketing", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_empresa: {
    type: DataTypes.INTEGER,
  },
  fecha_inicio: {
    type: DataTypes.DATEONLY,
  },
  fecha_fin: {
    type: DataTypes.DATEONLY,
  },
  id_tipo: {
    type: DataTypes.INTEGER,
  },
  titulo: {
    type: DataTypes.STRING(150),
  },
  observacion: {
    type: DataTypes.STRING(1000),
  },
  // documentos del evento: tb_image.uid_location = uid_file
  uid_file: {
    type: DataTypes.STRING,
  },
  // fotos del evento: tb_image.uid_location = uid_images
  uid_images: {
    type: DataTypes.STRING,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

CalendarioMarketing.hasMany(ImagePT, {
  foreignKey: "uid_location",
  sourceKey: "uid_file",
  as: "archivos",
  constraints: false,
});

CalendarioMarketing.hasMany(ImagePT, {
  foreignKey: "uid_location",
  sourceKey: "uid_images",
  as: "imagenes",
  constraints: false,
});

CalendarioMarketing.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_tipo",
  as: "tipo",
  constraints: false,
});

CalendarioMarketing.sync()
  .then(async () => {
    // la tabla ya existia: agrega uid_images si falta y se lo da a los eventos que no lo tienen
    const qi = db.getQueryInterface();
    const tabla = CalendarioMarketing.getTableName();
    const columnas = await qi.describeTable(tabla);
    if (!columnas.uid_images) {
      await qi.addColumn(tabla, "uid_images", { type: DataTypes.STRING, allowNull: true });
      console.log(`Columna uid_images agregada a ${tabla}.`);
    }
    await db.query(`UPDATE ${tabla} SET uid_images = LOWER(CONVERT(varchar(36), NEWID())) WHERE uid_images IS NULL`);
    console.log("La tabla CalendarioMarketing ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error,
    );
  });

module.exports = {
  CalendarioMarketing,
};
