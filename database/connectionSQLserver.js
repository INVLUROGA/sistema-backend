const sql = require("mssql");
require("dotenv").config(); 

const dbConfig = {
  user: process.env.USER_DB, // Nombre de usuario de la base de datos
  password: process.env.PASSWORD_DB, // Contraseña del usuario
  server: process.env.HOST, // Nombre o IP del servidor SQL Server
  database: "db_luroga", // Nombre de la base de datos
  options: {
    encrypt: true, 
    trustServerCertificate: true, 
  },
};

// Conexión a la base de datos
const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then((pool) => {
    console.log("Conectado a SQL Server");
    return pool;
  })
  .catch((err) => {
    console.error("Error al conectar a SQL Server", err);
  });
module.exports = {
  poolPromise,
  sql,
};
