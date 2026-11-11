const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Cliente } = require("./Usuarios");

const CanjeStatus = db.define("tb_canjeStatus", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_empresa: {
    type: DataTypes.INTEGER,
  },
  id_cli: {
    type: DataTypes.INTEGER,
  },
  contrato: {
    type: DataTypes.BOOLEAN, // bit
    defaultValue: false,
  },
  n_reel_acuerdo_x_mes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  n_historia_acuerdo_x_mes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // link al perfil del influencer (instagram, tiktok, etc.)
  link: {
    type: DataTypes.STRING(500),
  },
  // texto libre / comentario sobre el influencer
  observacion: {
    type: DataTypes.STRING(1000),
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

// id_tipo: 1 = REEL, 2 = HISTORIA
const PublicacionesCanje = db.define("tb_publicacionesCanje", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_empresa: {
    type: DataTypes.INTEGER,
  },
  id_cli: {
    type: DataTypes.INTEGER,
  },
  titulo: {
    type: DataTypes.STRING(200),
  },
  id_tipo: {
    type: DataTypes.INTEGER,
  },
  fecha: {
    type: DataTypes.DATEONLY,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

CanjeStatus.belongsTo(Cliente, {
  foreignKey: "id_cli",
  targetKey: "id_cli",
  as: "cliente",
  constraints: false,
});
PublicacionesCanje.belongsTo(Cliente, {
  foreignKey: "id_cli",
  targetKey: "id_cli",
  as: "cliente",
  constraints: false,
});

CanjeStatus.sync()
  .then(async () => {
    // si la tabla ya existía antes de agregar estas columnas, se agregan
    const qi = db.getQueryInterface();
    const columnas = await qi.describeTable(CanjeStatus.getTableName());
    const nuevas = {
      link: DataTypes.STRING(500),
      observacion: DataTypes.STRING(1000),
    };
    for (const [nombre, type] of Object.entries(nuevas)) {
      if (!columnas[nombre]) {
        await qi.addColumn(CanjeStatus.getTableName(), nombre, { type, allowNull: true });
      }
    }
    console.log("La tabla CanjeStatus ha sido creada o ya existe.");
  })
  .catch((error) =>
    console.error("Error al sincronizar el modelo con la base de datos:", error),
  );
PublicacionesCanje.sync()
  .then(() =>
    console.log("La tabla PublicacionesCanje ha sido creada o ya existe."),
  )
  .catch((error) =>
    console.error("Error al sincronizar el modelo con la base de datos:", error),
  );

module.exports = {
  CanjeStatus,
  PublicacionesCanje,
};
