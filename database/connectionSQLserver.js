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

// Conexión a la base de datos.
// Si la conexión falla (ej. la BD no responde justo al reiniciar Azure), se vuelve
// a intentar en la siguiente consulta, en lugar de quedar rota hasta reiniciar la app.
let conexion = null;

function conectar() {
  if (!conexion) {
    const pool = new sql.ConnectionPool(dbConfig);
    pool.on("error", (err) => {
      console.error("Error en la conexión a SQL Server", err);
      conexion = null;
    });
    conexion = pool
      .connect()
      .then(() => {
        console.log("Conectado a SQL Server");
        return pool;
      })
      .catch((err) => {
        console.error("Error al conectar a SQL Server", err);
        conexion = null;
        throw err;
      });
  }
  return conexion;
}

// Se usa igual que antes: `const pool = await poolPromise;`
// Cada `await` obtiene la conexión actual (o la reintenta si la anterior falló).
const poolPromise = {
  then(resolve, reject) {
    return conectar().then(resolve, reject);
  },
};

// Conexión inicial al arrancar (si falla, se reintenta en la primera consulta)
conectar().catch(() => {});

module.exports = {
  poolPromise,
  sql,
};
