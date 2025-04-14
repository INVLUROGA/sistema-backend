// services/commandService.js
const { sql, poolPromise } = require("../database/connectionSQLserver");

// Función para insertar un comando en dbo.zk_QueueCMD
async function insertCommand(DeviceSN, CMD) {
  const pool = await poolPromise;
  const query = `
        INSERT INTO dbo.zk_QueueCMD (DeviceSN, CMD, CreationTime)
        VALUES (@DeviceSN, @CMD, FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz'))
    `;

  // Ejecutar la consulta para insertar el comando
  await pool
    .request()
    .input("DeviceSN", sql.VarChar(20), DeviceSN)
    .input("CMD", sql.VarChar(sql.MAX), CMD)
    .query(query);
}

// Función para obtener el comando más reciente por DeviceSN
async function getRecentCommandByDeviceSN(DeviceSN) {
  const pool = await poolPromise;
  const query = `
        SELECT TOP 10 Id, CMD
        FROM dbo.zk_QueueCMD
        WHERE DeviceSN = @DeviceSN
        ORDER BY CreationTime ASC
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

    // Consulta para obtener todos los DeviceSN de la tabla dbo.zk_Devices
    const result = await pool
      .request()
      .query("SELECT DeviceSN FROM dbo.zk_Devices WHERE IsActive = 1");

    // Verificar si se han encontrado dispositivos
    if (result.recordset.length === 0) {
      console.log("No se encontraron dispositivos activos.");
      return;
    }

    // Construir los valores para el INSERT masivo
    let insertValues = result.recordset
      .map((device) => {
        const DeviceSN = device.DeviceSN;
        const CMD = broadcast_cmd;
        return `('${DeviceSN}', '${CMD}', FORMAT(SYSDATETIMEOFFSET(), \'yyyy-MM-dd HH:mm:ss zzz\'))`;
      })
      .join(",");

    // Consulta para insertar todos los comandos en una sola operación
    const insertQuery = `
            INSERT INTO dbo.zk_QueueCMD (DeviceSN, CMD, CreationTime)
            VALUES ${insertValues}
        `;

    // Ejecutar la consulta
    await pool.request().query(insertQuery);
    console.log(
      `Comandos insertados para ${result.recordset.length} dispositivos.`
    );
  } catch (err) {
    console.error("Error al procesar dispositivos e insertar comandos:", err);
    throw new Error("Error en el servicio");
  }
}

module.exports = {
  getRecentCommandByDeviceSN,
  deleteCommandById,
  insertCommand,
  broadCastCommand,
};
