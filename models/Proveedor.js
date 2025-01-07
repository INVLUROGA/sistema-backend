const { db } = require("../database/sequelizeConnection");
const { DataTypes } = require("sequelize");
const uuid = require("uuid");
const { Parametros } = require("./Parametros");

const Proveedor = db.define(
  "tb_Proveedor",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    uid: {
      type: DataTypes.STRING,
    },
    nombre_contacto: {
      type: DataTypes.STRING(300),
    },
    ruc_prov: {
      type: DataTypes.STRING(30),
    },
    id_tarjeta: {
      type: DataTypes.INTEGER,
    },
    n_cuenta: {
      type: DataTypes.STRING(50),
    },
    cci: {
      type: DataTypes.STRING(50),
    },
    razon_social_prov: {
      type: DataTypes.STRING(150),
    },
    titular_cci: {
      type: DataTypes.STRING(150),
    },
    tel_prov: {
      type: DataTypes.STRING(250),
    },
    cel_prov: {
      type: DataTypes.STRING(250),
    },
    email_prov: {
      type: DataTypes.STRING(300),
    },
    direc_prov: {
      type: DataTypes.STRING(300),
    },
    dni_vend_prov: {
      type: DataTypes.STRING(20),
    },
    nombre_vend_prov: {
      type: DataTypes.STRING(300),
    },
    cel_vend_prov: {
      type: DataTypes.STRING(100),
    },
    email_vend_prov: {
      type: DataTypes.STRING(100),
    },
    id_oficio: {
      type: DataTypes.INTEGER,
    },
    uid_perfil_image: {
      type: DataTypes.STRING,
    },
    uid_comentario: {
      type: DataTypes.STRING,
    },
    uid_contrato_proveedor: {
      type: DataTypes.STRING,
    },
    uid_presupuesto_proveedor: {
      type: DataTypes.STRING,
    },
    uid_documentos_proveedor: {
      type: DataTypes.STRING,
    },
    estado_prov: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    es_agente: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    id_marca: {
      type: DataTypes.INTEGER,
    },
    id_familiar: {
      type: DataTypes.INTEGER,
    },
    nombres_familiar: {
      type: DataTypes.STRING(150),
    },
    correo_familiar: {
      type: DataTypes.STRING(250),
    },
    cel_familiar: {
      type: DataTypes.STRING(20),
    },
    celular_contacto: {
      type: DataTypes.STRING(20),
    },
    correo_contacto: {
      type: DataTypes.STRING(250),
    },
    id_empresa: {
      type: DataTypes.INTEGER,
    },
    flag: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  { tableName: "tb_Proveedor" }
);

const ContratoProv = db.define("prov_contratos", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  cod_trabajo: {
    type: DataTypes.STRING(10),
  },
  id_prov: {
    type: DataTypes.INTEGER,
  },
  fecha_inicio: {
    type: DataTypes.STRING(24),
  },
  fecha_fin: {
    type: DataTypes.STRING(24),
  },
  hora_fin: {
    type: DataTypes.TIME,
  },
  penalidad_porcentaje: {
    type: DataTypes.DECIMAL(10, 2),
  },
  penalidad_fijo: {
    type: DataTypes.DECIMAL(10, 2),
  },
  monto_contrato: {
    type: DataTypes.DECIMAL(10, 2),
  },
  observacion: {
    type: DataTypes.STRING(660),
  },
  tipo_moneda: {
    type: DataTypes.STRING(4),
  },
  estado_contrato: {
    type: DataTypes.INTEGER,
  },
  uid_presupuesto: {
    type: DataTypes.STRING,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
const PagosContratoProv = db.define("contratos_prov_pagos", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_contrato_prov: {
    type: DataTypes.INTEGER,
  },
  fecha_pago: {
    type: DataTypes.STRING(24),
  },
  monto_pagado: {
    type: DataTypes.DECIMAL(10, 2),
  },
  observacion_pagado: {
    type: DataTypes.STRING(660),
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

// // En Proveedor.js
Proveedor.hasOne(Parametros, {
  foreignKey: "id_param", // clave foránea en Proveedor
  sourceKey: "id_oficio", // clave primaria en Parametros
  as: "parametro_oficio",
});

Proveedor.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_marca",
  as: "parametro_marca",
});

Proveedor.sync()
  .then(() => {
    console.log("La tabla Proveedor ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: Proveedor",
      error
    );
  });

ContratoProv.sync()
  .then(() => {
    console.log("La tabla ContratoProv ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: ContratoProv",
      error
    );
  });
module.exports = {
  Proveedor,
  ContratoProv,
};
