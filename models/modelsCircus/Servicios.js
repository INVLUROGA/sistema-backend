const { DataTypes } = require("sequelize");
const { db } = require("../../database/sequelizeConnection");
const { Parametros, EtiquetasxIds } = require("../Parametros");
const uuid = require("uuid");

const ServiciosCircus = db.define("circus_servicios", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  uid: {
    type: DataTypes.STRING,
  },
  nombre_servicio: {
    type: DataTypes.STRING(5),
  },
  descripcion: {
    type: DataTypes.STRING(300),
  },
  id_categoria: {
    type: DataTypes.INTEGER,
  },
  id_subCategoria: {
    type: DataTypes.INTEGER,
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
  },
  duracion: {
    type: DataTypes.INTEGER,
  },
  id_empresa: {
    type: DataTypes.INTEGER,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

EtiquetasxIds.hasOne(ServiciosCircus, {
  foreignKey: "id",
  sourceKey: "id_parametroEtiqueta",
  as: "parametro_servicio",
});
ServiciosCircus.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_categoria",
});
const carcel = async () => {
  try {
    console.log("Inicio del proceso de asignación de UUID");

    // Encuentra todas las filas de la tabla
    const filas = await ServiciosCircus.findAll();

    // Crear un array de promesas para realizar las actualizaciones de manera paralela
    const promesas = filas.map((fila) => {
      if (fila.uid === null) {
        // Comparación con null
        // Genera un nuevo UUID
        const UUID = uuid.v4();

        // Devuelve la promesa de actualización para cada fila
        return fila.update({ uid: UUID });
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
ServiciosCircus.sync()
  .then(() => {
    console.log("La tabla ServiciosCircus ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: ServiciosCircus",
      error
    );
  });

module.exports = {
  ServiciosCircus,
};
