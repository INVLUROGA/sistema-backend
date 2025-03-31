const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { ImagePT } = require("./Image");
const { Parametros, Parametros_zonas } = require("./Parametros");
const uuid = require("uuid");
const { ProspectoLead } = require("./ProspectoLead");

const Articulos = db.define("tb_articulos", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  fecha_entrada: {
    type: DataTypes.STRING(12),
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
  costo_unitario_soles: {
    type: DataTypes.DECIMAL(10, 2),
  },
  costo_unitario_dolares: {
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
  mano_obra_dolares: {
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

const Kardex_Inventario = db.define("tb_kardex_inventario", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  cantidad: {
    type: DataTypes.INTEGER,
  },
  id_item: {
    type: DataTypes.INTEGER,
  },
  id_lugar_destino: {
    type: DataTypes.INTEGER,
  },
  id_motivo: {
    type: DataTypes.INTEGER,
  },
  id_enterprice: {
    type: DataTypes.INTEGER,
  },
  observacion: {
    type: DataTypes.STRING(990),
  },
  fecha_cambio: {
    type: DataTypes.STRING(12),
  },
  action: {
    type: DataTypes.STRING(20),
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

// const Kardex_Inventario_Transferencia = db.define("tb_kardex_inventario_transferencia", {
//   id: {
//     type: DataTypes.INTEGER,
//     autoIncrement: true,
//     primaryKey: true,
//   },
//   cantidad: {
//     type: DataTypes.INTEGER,
//   },
//   id_item: {
//     type: DataTypes.INTEGER,
//   },
//   id_lugar_destino: {
//     type: DataTypes.INTEGER,
//   },
//   id_motivo: {
//     type: DataTypes.INTEGER,
//   },
//   id_enterprice: {
//     type: DataTypes.INTEGER,
//   },
//   observacion: {
//     type: DataTypes.STRING(990),
//   },
//   fecha_cambio: {
//     type: DataTypes.STRING(12),
//   },
//   action: {
//     type: DataTypes.STRING(20),
//   },
//   flag: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: true,
//   },
// });
Kardex_Inventario.hasOne(Parametros_zonas, {
  foreignKey: "id",
  sourceKey: "id_lugar_destino",
  as: "parametro_lugar_destino",
});
Kardex_Inventario.hasOne(Articulos, {
  foreignKey: "id",
  sourceKey: "id_item",
  as: "articulos_kardex",
});
Kardex_Inventario.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_motivo",
  as: "parametro_motivo",
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
Articulos.hasOne(Parametros_zonas, {
  foreignKey: "id",
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
Kardex_Inventario.sync()
  .then(() => {
    console.log("La tabla Kardex_Inventario ha sido sync o ya existe.");
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
  Kardex_Inventario,
};
