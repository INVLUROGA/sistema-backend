const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

const OPCIONES_CHECKLIST_ITEM = [
  "arreglo",
  "ajuste",
  "cambio",
  "pintura",
  "limpieza",
  "lubricacion",
  "revision_electrica",
  "otros",
];

const Checklist = db.define("tb_checklist", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_empresa: {
    type: DataTypes.INTEGER,
  },
  titulo: {
    type: DataTypes.STRING(120),
  },
  fecha_checklist: {
    type: DataTypes.STRING(12),
  },
  responsable: {
    type: DataTypes.STRING(80),
  },
  observacion_general: {
    type: DataTypes.STRING(890),
  },
  estado: {
    type: DataTypes.STRING(20),
    defaultValue: "PENDIENTE",
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const ChecklistItem = db.define("tb_checklist_item", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_checklist: {
    type: DataTypes.INTEGER,
  },
  id_articulo: {
    type: DataTypes.INTEGER,
  },
  producto: {
    type: DataTypes.STRING(150),
  },
  opciones: {
    type: DataTypes.STRING(500),
    defaultValue: "[]",
  },
  observacion: {
    type: DataTypes.STRING(890),
  },
  revisado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  uid_imagen_item: {
    type: DataTypes.STRING,
  },
  uid_foto_antes: {
    type: DataTypes.STRING,
  },
  uid_foto_despues: {
    type: DataTypes.STRING,
  },
  nombre_imagen_inicial: {
    type: DataTypes.STRING(255),
  },
  orden: {
    type: DataTypes.INTEGER,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

Checklist.hasMany(ChecklistItem, {
  foreignKey: "id_checklist",
  sourceKey: "id",
  as: "items",
});
ChecklistItem.belongsTo(Checklist, {
  foreignKey: "id_checklist",
  targetKey: "id",
});

Checklist.sync()
  .then(() => {
    console.log("La tabla Checklist ha sido sync o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo Checklist con la base de datos:",
      error,
    );
  });

ChecklistItem.sync()
  .then(() => {
    console.log("La tabla ChecklistItem ha sido sync o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo ChecklistItem con la base de datos:",
      error,
    );
  });

module.exports = {
  Checklist,
  ChecklistItem,
  OPCIONES_CHECKLIST_ITEM,
};
