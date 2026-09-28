// Controlador para /iclock/ping
// Latido (heartbeat) de los equipos ZKTeco (protocolo PUSH/ADMS).
// El firmware exige SIEMPRE 200 "OK" en text/plain, así que la respuesta
// se envía de inmediato y el registro en BD se hace después, sin bloquear.
const heartbeatService = require("../../../services/heartbeatService");

exports.fxget = (req, res) => {
  res.status(200).type("text/plain").send("OK");

  const DeviceSN = heartbeatService.obtenerSN(req);
  const ip = heartbeatService.obtenerIp(req);
  console.log(`[iclock/ping] OK -> SN: ${DeviceSN || "(sin SN)"} | IP: ${ip}`);

  // Se retorna la promesa solo para facilitar los tests; Express la ignora
  return heartbeatService.registrarLatidoDesdeRequest(req, "iclock/ping");
};
