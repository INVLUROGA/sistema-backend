const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { ImagePT } = require("./Image");
const { Parametros } = require("./Parametros");
const uuid = require("uuid");
const { ProspectoLead } = require("./ProspectoLead");

const Articulos = db.define("tb_articulos", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  uid_image: {
    type: DataTypes.STRING,
  },
  producto: {
    type: DataTypes.STRING(40),
  },
  id_marca: {
    type: DataTypes.INTEGER,
  },
  descripcion: {
    type: DataTypes.STRING(890),
  },
  cantidad: {
    type: DataTypes.INTEGER,
  },
  costo_unitario: {
    type: DataTypes.DECIMAL(10, 2),
  },
  costo_total_soles: {
    type: DataTypes.DECIMAL(10, 2),
  },
  costo_total_dolares: {
    type: DataTypes.DECIMAL(10, 2),
  },
  mano_obra_soles: {
    type: DataTypes.DECIMAL(10, 2),
  },
  lugar_compra_cotizacion: {
    type: DataTypes.STRING,
  },
  id_lugar: {
    type: DataTypes.INTEGER,
  },
  nivel: {
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

Articulos.hasMany(ImagePT, {
  foreignKey: "uid_location",
  sourceKey: "uid_image",
});
Articulos.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_marca",
  as: "parametro_marca",
});
Articulos.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_lugar",
  as: "parametro_lugar_encuentro",
});
Articulos.sync()
  .then(() => {
    console.log("La tabla Articulos ha sido sync o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });

const carcel = async () => {
  try {
    console.log("Inicio del proceso de asignación de UUID");

    // Encuentra todas las filas de la tabla
    const filas = await Articulos.findAll();

    // Crear un array de promesas para realizar las actualizaciones de manera paralela
    const promesas = filas.map((fila) => {
      if (fila.uid_image === null) {
        // Comparación con null
        // Genera un nuevo UUID
        const UUID = uuid.v4();

        // Devuelve la promesa de actualización para cada fila
        return fila.update({ uid_image: UUID });
      }
    });

    // Ejecuta todas las actualizaciones en paralelo
    await Promise.all(promesas);

    console.log("Artículos asignados correctamente.");
  } catch (error) {
    console.error("Error al asignar UUID:", error);
  }
};
// carcel();
module.exports = {
  Articulos,
};
