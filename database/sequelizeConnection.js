const { Sequelize } = require("sequelize");
const env = process.env;

// Option 3: Passing parameters separately (other dialects)
const db = new Sequelize("db_luroga", env.USER_DB, env.PASSWORD_DB, {
  host: env.HOST,
  dialect: "mssql",
  logging: false,
  timezone: "+00:00", // <- UTC, así no varía según servidor
  dialectOptions: {
    options: {
      useUTC: true,
      encrypt: true,
      rowCollectionOnRequestCompletion: true,
      requestTimeout: 30000, // <-- Aquí está bien colocado
    },
  },

  pool: {
    max: 5,
    min: 0,
    acquire: 60000,
    idle: 10000,
  },
});

module.exports = {
  db,
};
