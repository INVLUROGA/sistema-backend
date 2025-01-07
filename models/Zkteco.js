const { DataTypes, Sequelize } = require("sequelize");

const { db } = require("../database/sequelizeConnection");
const { ImagePT } = require("./Image");
const { Parametros } = require("./Parametros");
const uuid = require("uuid");
const Device = db.define("zk_Devices", {
  Id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  DeviceSN: {
    type: DataTypes.STRING(20),
  },
  CreationTime: {
    type: DataTypes.DATE(),
  },
  UpdateTime: {
    type: DataTypes.DATE(),
  },
  LastRegistry: {
    type: DataTypes.DATE(),
  },
  IsActive: {
    type: DataTypes.BOOLEAN,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
const QueueCMD = db.define("zk_QueueCMD", {
  Id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  DeviceSN: {
    type: DataTypes.STRING(20),
  },
  CMD: {
    type: DataTypes.TEXT,
  },
  UpdateTime: {
    type: DataTypes.DATE(),
  },
  LastRegistry: {
    type: DataTypes.DATE(),
  },
  IsActive: {
    type: DataTypes.BOOLEAN,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
const Transactions = db.define("zk_Transactions", {
  Id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  UserCode: {
    type: DataTypes.INTEGER,
  },
  Device: {
    type: DataTypes.STRING(20),
  },
  PunchTime: {
    type: DataTypes.DATE(),
  },
  UploadTime: {
    type: DataTypes.DATE(),
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
const UserData64 = db.define("zk_UserData64", {
  Id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  UserCode: {
    type: DataTypes.INTEGER,
  },
  DataLabel: {
    type: DataTypes.STRING(100),
  },
  DataIndex: {
    type: DataTypes.INTEGER,
  },
  SizeData: {
    type: DataTypes.INTEGER,
  },
  BinaryData: {
    type: DataTypes.BLOB("long"),
  },
  HashData: {
    type: DataTypes.BLOB(32),
  },
  CreationTime: {
    type: DataTypes.DATE,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
const Users = db.define("zk_User", {
  UserCode: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  Name: {
    type: DataTypes.CHAR(40),
  },
  Password: {
    type: DataTypes.INTEGER,
  },
  Card: {
    type: DataTypes.STRING(20),
  },
  CreationTime: {
    type: DataTypes.DATE,
  },
  UpdateTime: {
    type: DataTypes.DATE,
  },
  IsActive: {
    type: DataTypes.BOOLEAN,
  },
  Role: {
    type: DataTypes.INTEGER,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
// Usuario.sync()
//   .then(() => {
//     console.log("La tabla Usuario ha sido creada o ya existe.");
//   })
//   .catch((error) => {
//     console.error(
//       "Error al sincronizar el modelo con la base de datos:",
//       error
//     );
//   });

// module.exports = {
//   Usuario,
// };
