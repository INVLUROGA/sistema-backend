// services/heartbeatService.js
// Registro del latido (heartbeat) de los equipos ZKTeco.
// Lo usan /iclock/ping, /iclock/getrequest y /iclock/cdata: nunca bloquea la
// respuesta al equipo y nunca lanza errores (solo los registra en consola).
const deviceService = require("./deviceService");
const heartbeatCache = require("./heartbeatCache");

const MAX_LONGITUD_SN = 20; // dbo.zk_Devices.DeviceSN es VARCHAR(20)

function obtenerSN(req) {
  return typeof req.query?.SN === "string" ? req.query.SN.trim() : "";
}

// IP real del equipo: primer valor de X-Forwarded-For (proxy) o el socket
function obtenerIp(req) {
  const xff = req.headers?.["x-forwarded-for"];
  let ip = (xff ? String(xff).split(",")[0] : req.socket?.remoteAddress || "").trim();

  if (ip.startsWith("[")) {
    ip = ip.slice(1, ip.indexOf("]")); // [IPv6]:puerto
  } else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.split(":")[0]; // IPv4:puerto (Azure lo envía así)
  }
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);

  return ip.slice(0, 45) || null;
}

async function registrarLatido(DeviceSN, ip, origen) {
  heartbeatCache.marcarEscritura(DeviceSN);
  try {
    const existe =
      DeviceSN.length <= MAX_LONGITUD_SN &&
      (await deviceService.registrarLatido(DeviceSN, ip));
    if (!existe) {
      console.warn(`[${origen}] SN desconocido: ${DeviceSN} desde IP ${ip}`);
    }
  } catch (err) {
    // Permite reintentar en la siguiente petición en lugar de esperar 30 s
    heartbeatCache.olvidar(DeviceSN);
    console.error(`[${origen}] Error al registrar latido de ${DeviceSN}`, err);
  }
}

/// Registra el latido a partir de la petición, respetando el intervalo de 30 s.
/// No se debe esperar (await) en los controladores; retorna la promesa solo para tests.
function registrarLatidoDesdeRequest(req, origen) {
  const DeviceSN = obtenerSN(req);
  if (!DeviceSN || !heartbeatCache.debeEscribir(DeviceSN)) return;
  return registrarLatido(DeviceSN, obtenerIp(req), origen);
}

module.exports = {
  obtenerSN,
  obtenerIp,
  registrarLatidoDesdeRequest,
};
