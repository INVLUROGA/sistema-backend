const { DataTypes, Sequelize } = require("sequelize");

const { db } = require("../database/sequelizeConnection");
const { ImagePT } = require("./Image");
const { Parametros } = require("./Parametros");
const uuid = require("uuid");
//El usuario es todo aca, cuando registra un producto, el es al que se le notifica si el producto esta en stock minimo
//Hay una pagina que se encarga de ver a quien notificar que hacen los usuarios
const Usuario = db.define("auth_user", {
  id_user: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  uid: {
    type: DataTypes.STRING,
  },
  nombres_user: {
    type: DataTypes.STRING,
  },
  apellidos_user: {
    type: DataTypes.STRING,
  },
  usuario_user: {
    type: DataTypes.STRING,
  },
  password_user: {
    type: DataTypes.STRING,
  },
  email_user: {
    type: DataTypes.STRING,
  },
  telefono_user: {
    type: DataTypes.STRING,
  },
  rol_user: {
    type: DataTypes.INTEGER,
  },
  notiPush_user: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  estado_user: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const Empleado = db.define("tb_empleado", {
  //Datos generales
  id_empl: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  uid: {
    type: DataTypes.STRING,
  },
  uid_avatar: {
    type: DataTypes.STRING,
  },
  nombre_empl: {
    type: DataTypes.STRING,
  },
  apPaterno_empl: {
    type: DataTypes.STRING,
  },
  apMaterno_empl: {
    type: DataTypes.STRING,
  },
  fecNac_empl: {
    type: DataTypes.DATEONLY,
  },
  fecha_nacimiento: {
    type: DataTypes.DATE,
  },
  sexo_empl: {
    type: DataTypes.INTEGER,
  },
  estCivil_empl: {
    type: DataTypes.INTEGER,
  },
  tipoDoc_empl: {
    type: DataTypes.INTEGER,
  },
  numDoc_empl: {
    type: DataTypes.STRING(35),
  },
  nacionalidad_empl: {
    type: DataTypes.STRING,
  },
  ubigeo_distrito_empl: {
    type: DataTypes.INTEGER,
  },
  direccion_empl: {
    type: DataTypes.STRING,
  },
  email_empl: {
    type: DataTypes.STRING,
  },
  email_corporativo: {
    type: DataTypes.STRING,
  },
  telefono_empl: {
    type: DataTypes.STRING,
  },
  //Informacion de empleo
  fecContrato_empl: {
    type: DataTypes.DATEONLY,
  },
  horario_empl: {
    type: DataTypes.STRING,
  },
  cargo_empl: {
    type: DataTypes.INTEGER,
  },
  departamento_empl: {
    type: DataTypes.INTEGER,
  },
  salario_empl: {
    type: DataTypes.DECIMAL(18, 2),
  },
  tipoContrato_empl: {
    type: DataTypes.INTEGER,
  },
  uid_comentario: {
    type: DataTypes.STRING,
  },
  uid_jornada: {
    type: DataTypes.STRING,
  },
  uid_contactsEmergencia: {
    type: DataTypes.STRING,
  },
  estado_empl: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  id_empresa: {
    type: DataTypes.INTEGER,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  //Informacion bancaria
});

const Cliente = db.define("tb_cliente", {
  id_cli: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  uid_avatar: {
    type: DataTypes.STRING,
  },
  uid: {
    type: DataTypes.STRING,
  },
  uid_file_adj: {
    type: DataTypes.STRING,
  },
  nombre_cli: {
    type: DataTypes.STRING,
  },
  apPaterno_cli: {
    type: DataTypes.STRING,
  },
  apMaterno_cli: {
    type: DataTypes.STRING,
  },
  fecNac_cli: {
    type: DataTypes.DATE,
  },
  fecha_nacimiento: {
    type: DataTypes.STRING(12),
  },
  sexo_cli: {
    type: DataTypes.INTEGER,
  },
  estCivil_cli: {
    type: DataTypes.INTEGER,
  },
  tipoDoc_cli: {
    type: DataTypes.INTEGER,
  },
  numDoc_cli: {
    type: DataTypes.STRING(35),
  },
  nacionalidad_cli: {
    type: DataTypes.INTEGER,
  },
  ubigeo_distrito_cli: {
    type: DataTypes.INTEGER,
  },
  ubigeo_distrito_trabajo: {
    type: DataTypes.INTEGER,
  },
  direccion_cli: {
    type: DataTypes.STRING,
  },
  tipoCli_cli: {
    type: DataTypes.INTEGER,
  },
  trabajo_cli: {
    type: DataTypes.STRING,
  },
  cargo_cli: {
    type: DataTypes.STRING,
  },
  email_cli: {
    type: DataTypes.STRING,
  },
  tel_cli: {
    type: DataTypes.STRING,
  },
  uid_comentario: {
    type: DataTypes.STRING,
  },
  uid_contactsEmergencia: {
    type: DataTypes.STRING,
  },
  estado_cli: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  id_empresa: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const Empresa = db.define("tb_empresa", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  domicilio: {
    type: DataTypes.STRING,
  },
  razon_social: {
    type: DataTypes.STRING,
  },
  ruc: {
    type: DataTypes.STRING(20),
  },
  id_duenio: {
    type: DataTypes.INTEGER,
  },
  telefono: {
    type: DataTypes.STRING(30),
  },
});

Empleado.hasMany(ImagePT, {
  foreignKey: "uid_location",
  sourceKey: "uid_avatar",
});

Cliente.hasMany(ImagePT, {
  foreignKey: "uid_location",
  sourceKey: "uid_avatar",
});
Cliente.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "sexo_cli",
  as: "parametro_sexo",
});

Cliente.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "tipoCli_cli",
  as: "parametro_tipocli",
});
Cliente.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "estCivil_cli",
  as: "parametro_estCivil",
});
Empresa.sync()
  .then(() => {
    console.log("La tabla Empresa ha sido sync o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });

Cliente.sync()
  .then(() => {
    console.log("La tabla Cliente ha sido drop o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });
Empleado.sync()
  .then(() => {
    console.log("La tabla Empleado ha sido sync o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: Empleado",
      error
    );
  });
Usuario.sync()
  .then(() => {
    console.log("La tabla Usuario ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });

const carcel = async () => {
  try {
    // Encuentra todas las filas de la tabla (o puedes hacerlo con un filtro específico)
    console.log("asdf");

    // Encuentra todas las filas de la tabla
    const filas = await Cliente.findAll();

    // Crear un array de promesas para realizar las actualizaciones de manera paralela
    const promesas = filas.map((fila) => {
      if (fila.uid_file_adj === null) {
        // Comparación con null
        // Genera un nuevo UUID
        const UUID = uuid.v4();

        // Devuelve la promesa de actualización para cada fila
        return fila.update({ uid_file_adj: UUID });
      }
    });

    // Ejecuta todas las actualizaciones en paralelo
    await Promise.all(promesas);

    console.log("Parametros  asignados correctamente.");
  } catch (error) {
    console.error("Error al asignar UUID:", error);
  }
};
// carcel();

// const carcel = () => {
// (async () => {
//   try {

//     await Cliente.update(
//       {
//         uid: uuid.v4()
//       },
//       {
//         where: {
//           uid: null,
//         },
//       }
//     );

//     console.log(
//       "Todos los valores null en la columna uid han sido actualizados."
//     );
//   } catch (error) {
//     console.error("Unable to connect to the database:", error);
//   }
// })();
// };
module.exports = {
  Cliente,
  Empleado,
  Usuario,
};
const carcel2 = () => {
  // const empleadosConUuid = empleados.map((empleado) => ({
  //   ...empleado,
  //   uid: uuid.v4(),
  //   uid_avatar: uuid.v4(),
  //   horario_empl: "",
  //   cargo_empl: 0,
  //   departamento_empl: 0,
  //   salario_empl: 0.0,
  //   uid_contactsEmergencia: uuid.v4(),
  //   uid_comentario: uuid.v4(),
  //   tipoContrato_empl: 0,
  // }));
  // Empleado.bulkCreate(empleadosConUuid)
  //   .then(() => {
  //     console.log("empleados successfully");
  //   })
  //   .catch((error) => {
  //     console.error("Error inserting posts:");
  //   });
};
