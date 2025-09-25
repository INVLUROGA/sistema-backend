const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Parametros } = require("./Parametros");
const { Empleado } = require("./Usuarios");

const tipoHorarioContrato = db.define("tb_tipoHorarioContrato", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_contrato: {
    type: DataTypes.INTEGER,
  },
  id_tipo_horario: {
    type: DataTypes.INTEGER,
  },
  fecha: {
    type: DataTypes.DATE,
  },
  hora_inicio: {
    type: DataTypes.TIME,
  },
  minutos: {
    type: DataTypes.INTEGER,
  },
  observacion: {
    type: DataTypes.STRING(360),
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const contrato_empleado = db.define("tb_contrato_empleado", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_empl: {
    type: DataTypes.INTEGER,
  },
  fecha_inicio: {
    type: DataTypes.DATE,
  },
  fecha_fin: {
    type: DataTypes.DATE,
  },
  sueldo: {
    type: DataTypes.DECIMAL(10, 2),
  },
  observacion: {
    type: DataTypes.STRING(260),
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

contrato_empleado.hasMany(tipoHorarioContrato, {
  foreignKey: "id_contrato",
  sourceKey: "id",
  as: "contrato_empl",
});

Empleado.hasMany(contrato_empleado, {
  foreignKey: "id_empl",
  sourceKey: "id_empl",
  as: "_empl",
});

const Jornada = db.define("tb_jornada_semanas", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  uid_jornada: {
    type: DataTypes.STRING(300),
    defaultValue: 0,
  },
  observacion: {
    type: DataTypes.STRING(300),
  },
  semana: {
    type: DataTypes.STRING(4),
  },
  LUNES_ENTRADA: {
    type: DataTypes.STRING(10),
  },
  LUNES_SALIDA: {
    type: DataTypes.STRING(10),
  },
  MARTES_ENTRADA: {
    type: DataTypes.STRING(10),
  },
  MARTES_SALIDA: {
    type: DataTypes.STRING(10),
  },
  MIERCOLES_ENTRADA: {
    type: DataTypes.STRING(10),
  },
  MIERCOLES_SALIDA: {
    type: DataTypes.STRING(10),
  },
  JUEVES_ENTRADA: {
    type: DataTypes.STRING(10),
  },
  JUEVES_SALIDA: {
    type: DataTypes.STRING(10),
  },
  VIERNES_ENTRADA: {
    type: DataTypes.STRING(10),
  },
  VIERNES_SALIDA: {
    type: DataTypes.STRING(10),
  },
  SABADO_ENTRADA: {
    type: DataTypes.STRING(10),
  },
  SABADO_SALIDA: {
    type: DataTypes.STRING(10),
  },
  DOMINGO_ENTRADA: {
    type: DataTypes.STRING(10),
  },
  DOMINGO_SALIDA: {
    type: DataTypes.STRING(10),
  },
  id_enterprice: {
    type: DataTypes.INTEGER,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
//ID, TIPO, DESCRIPCION, DIAS_HABILES, TIENE_SUELDO
const HorasEspeciales = db.define("jornada_horas_especiales", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  uid_empleado: {
    type: DataTypes.STRING,
  },
  id_tipo_hora: {
    type: DataTypes.INTEGER,
  },
  observacion: {
    type: DataTypes.STRING(280),
  },
  fecha_desde: {
    type: DataTypes.DATE,
  },
  fecha_antes: {
    type: DataTypes.DATE,
  },
  cantidad_minutos: {
    type: DataTypes.INTEGER,
  },
  con_goce_sueldo: {
    type: DataTypes.BOOLEAN,
  },
  tipo_hora_especial: {
    type: DataTypes.INTEGER, // permisos, tardanzas, horas extras, salidas tempranas
  },
  id_enterprice: {
    type: DataTypes.INTEGER,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const jornadaPlanilla = db.define("jornada_planilla", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  uid_empleado: {
    type: DataTypes.STRING,
  },
  observacion: {
    type: DataTypes.STRING(280),
  },
  fecha_desde: {
    type: DataTypes.DATE,
  },
  fecha_hasta: {
    type: DataTypes.DATE,
  },
  id_enterprice: {
    type: DataTypes.INTEGER,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

HorasEspeciales.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_tipo_hora",
  as: "tipo_hora",
});

HorasEspeciales.hasMany(Empleado, {
  foreignKey: "uid",
  sourceKey: "uid_empleado",
  as: "horas_empleado",
});

// Sincroniza el modelo con la base de datos (crea la tabla si no existe)
tipoHorarioContrato
  .sync()
  .then(() => {
    console.log("La tabla tipoHorarioContrato ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });

// Sincroniza el modelo con la base de datos (crea la tabla si no existe)
contrato_empleado
  .sync()
  .then(() => {
    console.log("La tabla contrato_empleado ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });

// Sincroniza el modelo con la base de datos (crea la tabla si no existe)
Jornada.sync()
  .then(() => {
    console.log("La tabla Jornada ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });

jornadaPlanilla
  .sync()
  .then(() => {
    console.log("La tabla jornadaPlanilla ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });

// Sincroniza el modelo con la base de datos (crea la tabla si no existe)
HorasEspeciales.sync()
  .then(() => {
    console.log("La tabla HorasEspeciales ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });

module.exports = {
  Jornada,
  jornadaPlanilla,
  HorasEspeciales,
  contrato_empleado,
  tipoHorarioContrato,
};
