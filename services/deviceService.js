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

// Minutos sin latido para considerar un dispositivo fuera de línea
function obtenerMinutosOffline() {
  const minutos = Number(process.env.ZK_OFFLINE_MINUTES);
  return Number.isFinite(minutos) && minutos > 0 ? minutos : 3;
}

/// Servicio para registrar el latido de /iclock/ping.
/// Retorna true si el SN existe en dbo.zk_Devices, false si es desconocido.
async function registrarLatido(DeviceSN, ip) {
  // Conectar a la base de datos
  const pool = await poolPromise;

  const query = `
                UPDATE dbo.zk_Devices
                SET ultima_conexion = SYSUTCDATETIME(), ultima_ip = @ip
                WHERE DeviceSN = @DeviceSN
            `;

  const result = await pool
    .request()
    .input("DeviceSN", sql.VarChar(20), DeviceSN)
    .input("ip", sql.VarChar(45), ip)
    .query(query);

  return result.rowsAffected[0] > 0;
}

/// Calcula el estado de un dispositivo a partir de su ultima_conexion (UTC).
/// No se guarda en BD: un dispositivo está offline si no hay latido en X minutos.
function calcularEstado(ultimaConexion, ahora = new Date(), minutosOffline = obtenerMinutosOffline()) {
  if (!ultimaConexion) return "offline";
  const transcurridoMs = ahora.getTime() - new Date(ultimaConexion).getTime();
  return transcurridoMs <= minutosOffline * 60 * 1000 ? "online" : "offline";
}

/// Lista los dispositivos con su estado calculado (para el panel de administración)
async function listarDispositivosConEstado() {
  // Conectar a la base de datos
  const pool = await poolPromise;

  const query = `
                SELECT Id, DeviceSN, IsActive, ultima_conexion, ultima_ip
                FROM dbo.zk_Devices
                ORDER BY DeviceSN
            `;

  const result = await pool.request().query(query);
  const ahora = new Date();
  const minutosOffline = obtenerMinutosOffline();

  return result.recordset.map((device) => ({
    ...device,
    estado: calcularEstado(device.ultima_conexion, ahora, minutosOffline),
  }));
}

module.exports = {
  insertDevice,
  checkDeviceStatus,
  registrarLatido,
  calcularEstado,
  listarDispositivosConEstado,
  obtenerMinutosOffline,
};
