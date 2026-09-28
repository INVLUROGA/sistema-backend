// services/commandService.js
const { sql, poolPromise } = require("../database/connectionSQLserver");

// Función para insertar un comando en dbo.zk_QueueCMD.
// segundosDespues: fecha el comando unos segundos más tarde para que la cola lo entregue
// después de otro comando insertado en el mismo segundo (CreationTime se guarda al segundo).
async function insertCommand(DeviceSN, CMD, segundosDespues = 0) {
  const pool = await poolPromise;
  const query = `
        INSERT INTO dbo.zk_QueueCMD (DeviceSN, CMD, CreationTime)
        VALUES (@DeviceSN, @CMD, FORMAT(DATEADD(second, @segundosDespues, SYSDATETIMEOFFSET()), 'yyyy-MM-dd HH:mm:ss zzz'))
    `;

  // Ejecutar la consulta para insertar el comando
  await pool
    .request()
    .input("DeviceSN", sql.VarChar(20), DeviceSN)
    .input("CMD", sql.VarChar(sql.MAX), CMD)
    .input("segundosDespues", sql.Int, segundosDespues)
    .query(query);
}

/// ¿Hay una consulta de datos (DATA QUERY) pendiente para el equipo? (sincronización en curso)
async function hayConsultaPendiente(DeviceSN) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("DeviceSN", sql.VarChar(20), DeviceSN)
    .query(`
        SELECT COUNT(*) AS n
        FROM dbo.zk_QueueCMD
        WHERE DeviceSN = @DeviceSN AND CMD LIKE 'C:%:DATA QUERY %'
    `);
  return result.recordset[0].n > 0;
}

// Comandos que se entregan por cada /iclock/getrequest. Con varios comandos en una sola
// respuesta el SpeedFace descartaba algunos (ej. la huella de un usuario recién creado);
// uno por petición es lo probado. El equipo pregunta cada ~2 s (RequestDelay).
const COMANDOS_POR_PETICION = 1;

// Función para obtener el comando más antiguo pendiente por DeviceSN
async function getRecentCommandByDeviceSN(DeviceSN) {
  const pool = await poolPromise;
  // CreationTime se guarda al segundo: se desempata por Id (orden de inserción)
  const query = `
        SELECT TOP (${COMANDOS_POR_PETICION}) Id, CMD
        FROM dbo.zk_QueueCMD
        WHERE DeviceSN = @DeviceSN
        ORDER BY CreationTime ASC, Id ASC
    `;

  const result = await pool
    .request()
    .input("DeviceSN", sql.VarChar(20), DeviceSN)
    .query(query);

  if (result.recordset.length > 0) {
    return result.recordset; // Retorna el comando más reciente
  }
  return null; // Retorna null si no se encontró
}

// Función para eliminar un comando por id
async function deleteCommandById(Id) {
  const pool = await poolPromise;
  const query = `
        DELETE FROM dbo.zk_QueueCMD
        WHERE Id = @Id
    `;

  const result = await pool.request().input("Id", sql.Int, Id).query(query);

  return result.rowsAffected[0]; // Retorna cuántas filas fueron afectadas
}

// Servicio para consultar todos los DeviceSN de dbo.zk_Devices e insertar en dbo.zk_QueueCMD
async function broadCastCommand(broadcast_cmd) {
  try {
    // Conectarse a la base de datos
    const pool = await poolPromise;

    // Inserta el comando para todos los dispositivos activos en una sola operación.
    // El comando va como parámetro (nunca concatenado): los nombres con comillas
    // (ej. D'Angelo) no rompen la consulta ni permiten inyección SQL.
    const insertQuery = `
            INSERT INTO dbo.zk_QueueCMD (DeviceSN, CMD, CreationTime)
            SELECT DeviceSN, @CMD, FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz')
            FROM dbo.zk_Devices
            WHERE IsActive = 1
        `;

    const result = await pool
      .request()
      .input("CMD", sql.VarChar(sql.MAX), broadcast_cmd)
      .query(insertQuery);

    // Verificar si se han encontrado dispositivos
    const insertados = result.rowsAffected[0];
    if (insertados === 0) {
      console.log("No se encontraron dispositivos activos.");
      return;
    }
    console.log(`Comandos insertados para ${insertados} dispositivos.`);
  } catch (err) {
    console.error("Error al procesar dispositivos e insertar comandos:", err);
    throw new Error("Error en el servicio");
  }
}

// Qué hace un comando de la cola y para qué persona (PIN). Retorna null si no es de una persona
// (ej. DATA QUERY). Acepta el formato de control de acceso (Pin=) y el de asistencia (PIN=).
const OPERACIONES = {
  "UPDATE user": "alta del usuario",
  "UPDATE userinfo": "alta del usuario",
  "UPDATE templatev10": "envío de huella",
  "UPDATE fingertmp": "envío de huella",
  "UPDATE biodata": "envío de huella",
  "UPDATE userauthorize": "autorización de acceso",
  "DELETE user": "borrado del usuario",
  "DELETE userinfo": "borrado del usuario",
  "DELETE templatev10": "borrado de huella",
  "DELETE fingertmp": "borrado de huella",
  "DELETE biodata": "borrado de huella",
  "DELETE userauthorize": "borrado de autorización",
};
function describirComando(CMD) {
  const m = /^C:\d+:DATA (UPDATE|DELETE) (\w+)\s[^]*?\bPIN=(\d+)/i.exec(String(CMD));
  if (!m) return null;
  const tipo = `${m[1].toUpperCase()} ${m[2].toLowerCase()}`;
  return {
    pin: parseInt(m[3], 10),
    operacion: OPERACIONES[tipo] || tipo.toLowerCase(),
    esBorrado: m[1].toUpperCase() === "DELETE",
  };
}

/// Comandos pendientes en la cola, agrupados por persona (PIN):
/// Map pin -> { huelleros: [SN...], operaciones: [...], esBorrado }
async function listarPendientesPorPersona() {
  const pool = await poolPromise;
  // El PIN va al inicio del comando: no hace falta traer la plantilla completa de la huella
  const result = await pool.request().query(`
        SELECT DeviceSN, LEFT(CMD, 300) AS CMD
        FROM dbo.zk_QueueCMD
        ORDER BY CreationTime ASC, Id ASC
    `);

  const pendientes = new Map();
  for (const { DeviceSN, CMD } of result.recordset) {
    const comando = describirComando(CMD);
    if (!comando) continue;
    const actual = pendientes.get(comando.pin) || { huelleros: [], operaciones: [], esBorrado: false };
    if (!actual.huelleros.includes(DeviceSN)) actual.huelleros.push(DeviceSN);
    if (!actual.operaciones.includes(comando.operacion)) actual.operaciones.push(comando.operacion);
    actual.esBorrado = actual.esBorrado || comando.esBorrado;
    pendientes.set(comando.pin, actual);
  }
  return pendientes;
}

module.exports = {
  hayConsultaPendiente,
  describirComando,
  listarPendientesPorPersona,
  getRecentCommandByDeviceSN,
  deleteCommandById,
  insertCommand,
  broadCastCommand,
};
