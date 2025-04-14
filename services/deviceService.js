// services/deviceService.js
const { sql, poolPromise } = require("../database/connectionSQLserver");

/// Servicio para insertar un dispositivo en la tabla dbo.zk_Devices
async function insertDevice(DeviceSN, IsActive) {
  // Conectar a la base de datos
  const pool = await poolPromise;

  // Consulta SQL para insertar datos en dbo.zk_Devices
  const query = `
            INSERT INTO dbo.zk_Devices (DeviceSN, CreationTime, UpdateTime, LastRegistry, IsActive)
            VALUES (@DeviceSN, FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz'),FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz'), FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz'), @IsActive)
        `;

  // Ejecutar la consulta con los parámetros
  await pool
    .request()
    .input("DeviceSN", sql.VarChar(20), DeviceSN)
    .input("IsActive", sql.Bit, IsActive)
    .query(query);
}

async function checkDeviceStatus(DeviceSN) {
  // Conectar a la base de datos
  const pool = await poolPromise;

  // Consulta SQL para verificar si el dispositivo existe y si está activo
  const query = `
                SELECT IsActive
                FROM dbo.zk_Devices
                WHERE DeviceSN = @DeviceSN
            `;

  // Ejecutar la consulta con el parámetro DeviceSN
  const result = await pool
    .request()
    .input("DeviceSN", sql.VarChar(20), DeviceSN)
    .query(query);

  // Verificar si se encontró un dispositivo
  if (result.recordset.length === 0) {
    return false;
  }

  // Retornar el estado activo del dispositivo
  const IsActive = result.recordset[0].IsActive;
  return IsActive;
}

module.exports = {
  insertDevice,
  checkDeviceStatus,
};
