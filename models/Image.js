const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Proveedor } = require("./Proveedor");
const { Parametros, Parametros_zonas } = require("./Parametros");
const { ContratoProv } = require("./ContratoProv.model");

const ImagePT = db.define(
  "tb_image",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    uid_location: {
      type: DataTypes.STRING,
    },
    uid: {
      type: DataTypes.STRING,
    },
    name_image: {
      type: DataTypes.STRING,
    },
    extension_image: {
      type: DataTypes.STRING(15),
    },
    clasificacion_image: {
      type: DataTypes.STRING(80),
    },
    size_image: {
      type: DataTypes.INTEGER,
    },
    width: {
      type: DataTypes.STRING(8),
    },
    height: {
      type: DataTypes.STRING(8),
    },
    flag: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  { tableName: "tb_image" }
);
const Files = db.define("tb_files", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  fecha_file: {
    type: DataTypes.DATE,
  },
  uid_Location: {
    type: DataTypes.STRING,
  },
  id_tipo_file: {
    type: DataTypes.INTEGER,
  },
  uid_file: {
    type: DataTypes.STRING,
  },
  observacion: {
    type: DataTypes.STRING(225),
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const DocumentosInternos = db.define("tb_documentosInternos", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_seccionVisible: {
    type: DataTypes.INTEGER,
  },
  fecha_registro: {
    type: DataTypes.DATE,
  },
  uid_location: {
    type: DataTypes.STRING,
  },
  urlLink: {
    type: DataTypes.INTEGER,
  },
  uid_file: {
    type: DataTypes.STRING,
  },
  id_tipo_doc: {
    type: DataTypes.INTEGER,
  },
  titulo: {
    type: DataTypes.STRING(120),
  },
  observacion: {
    type: DataTypes.STRING(325),
  },
  id_empresa: {
    type: DataTypes.INTEGER,
  },
  id_user: {
    type: DataTypes.INTEGER,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

DocumentosInternos.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_seccionVisible",
  as: "visibles",
});

DocumentosInternos.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_tipo_doc",
  as: "tipo",
});

DocumentosInternos.hasOne(ImagePT, {
  foreignKey: "uid_location",
  sourceKey: "uid_file",
});
ImagePT.belongsTo(DocumentosInternos, {
  foreignKey: "uid_location",
  sourceKey: "uid_file",
});

Files.hasOne(ImagePT, {
  foreignKey: "uid_location",
  sourceKey: "uid_file",
});
ImagePT.belongsTo(Files, {
  foreignKey: "uid_location",
  sourceKey: "uid_file",
});
// ContratoProv.hasOne(ImagePT, {
//   foreignKey: "uid_location",
//   sourceKey: "uid_presupuesto",
// });
// ImagePT.belongsTo(ContratoProv, {
//   foreignKey: "uid_location",
//   sourceKey: "uid_presupuesto",
// });

ContratoProv.hasOne(ImagePT, {
  sourceKey: "uid_compromisoPago",
  foreignKey: "uid_location",
  as: "compromisoPago",
});
ContratoProv.hasOne(ImagePT, {
  sourceKey: "uid_contrato",
  foreignKey: "uid_location",
  as: "contratoProv",
});

Parametros_zonas.hasMany(ImagePT, {
  foreignKey: "uid_location",
  sourceKey: "uid_image",
});
Parametros.hasMany(ImagePT, {
  foreignKey: "uid_location",
  sourceKey: "uid_image",
});

Proveedor.hasOne(ImagePT, {
  foreignKey: "uid_location",
  sourceKey: "uid_perfil_image",
});
DocumentosInternos.sync()
  .then(() => {
    console.log("La tabla DocumentosInternos ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });
Files.sync()
  .then(() => {
    console.log("La tabla files ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });
// Sincroniza el modelo con la base de datos (crea la tabla si no existe)
ImagePT.sync()
  .then(() => {
    console.log("La tabla ImagePT ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });
module.exports = {
  ImagePT,
  Files,
  DocumentosInternos,
};
