const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Parametros } = require("./Parametros");
const { Empleado } = require("./Usuarios");
const { Distritos } = require("./Distritos");
const { Comentario } = require("./Modelos");
const uuid = require("uuid");
const ProspectoLead = db.define(
  "tb_prospectoLeads",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    uid_comentario: {
      type: DataTypes.STRING,
    },
    nombres: {
      type: DataTypes.STRING,
    },
    apellido_materno: {
      type: DataTypes.STRING,
    },
    apellido_paterno: {
      type: DataTypes.STRING,
    },
    celular: {
      type: DataTypes.STRING,
    },
    id_empl: {
      type: DataTypes.INTEGER,
    },
    id_canal: {
      type: DataTypes.INTEGER,
    },
    id_campania: {
      type: DataTypes.INTEGER,
    },
    ubigeo_distrito: {
      type: DataTypes.STRING,
    },
    plan_lead: {
      type: DataTypes.DECIMAL(10, 2),
    },
    fecha_cita: {
      type: DataTypes.STRING(12),
    },
    fecha_registro: {
      type: DataTypes.STRING(12),
    },
    ultimo_dia_seguimiento: {
      type: DataTypes.STRING(12),
    },
    id_estado_lead: {
      type: DataTypes.INTEGER,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    flag: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  { tableName: "tb_prospectoLeads" }
);
ProspectoLead.hasOne(Distritos, {
  foreignKey: "ubigeo",
  sourceKey: "ubigeo_distrito",
  as: "lead_distrito",
});
ProspectoLead.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_estado_lead",
  as: "parametro_estado_lead",
});
ProspectoLead.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_canal",
  as: "parametro_canal",
});

ProspectoLead.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_campania",
  as: "parametro_campania",
});
ProspectoLead.hasOne(Empleado, {
  foreignKey: "id_empl",
  sourceKey: "id_empl",
  as: "empleado",
});

ProspectoLead.hasMany(Comentario, {
  foreignKey: "uid_location",
  sourceKey: "uid_comentario",
  as: "comentario",
});

const carcel = async () => {
  try {
    // Encuentra todas las filas de la tabla (o puedes hacerlo con un filtro específico)
    const filas = await ProspectoLead.findAll();

    // Itera sobre cada fila para asignar un UUID distinto
    for (const fila of filas) {
      // Genera un nuevo UUID
      const UUID = uuid.v4();
      // Actualiza la fila con el nuevo UUID
      await fila.update({
        uid_comentario: UUID,
      });
    }

    console.log("ProspectoLead  asignados correctamente.");
  } catch (error) {
    console.error("Error al asignar UUID:", error);
  }
};
// carcel();

ProspectoLead.sync()
  .then(() => {
    console.log("La tabla ProspectoLead ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: ProspectoLead",
      error
    );
  });

module.exports = { ProspectoLead };
