// services/heartbeatCache.js
// Caché en memoria para no escribir en la BD en cada /iclock/ping.
// Guarda, por SN, el momento (ms) de la última escritura (o intento) en la BD.

const INTERVALO_ESCRITURA_MS = 30 * 1000;
const MAX_ENTRADAS = 5000; // evita crecimiento sin límite con SN aleatorios

const ultimaEscritura = new Map();

function debeEscribir(DeviceSN, ahora = Date.now()) {
  const ultima = ultimaEscritura.get(DeviceSN);
  return ultima === undefined || ahora - ultima >= INTERVALO_ESCRITURA_MS;
}

function marcarEscritura(DeviceSN, ahora = Date.now()) {
  if (ultimaEscritura.size >= MAX_ENTRADAS) {
    // Purga las entradas vencidas antes de agregar una nueva
    for (const [sn, t] of ultimaEscritura) {
      if (ahora - t >= INTERVALO_ESCRITURA_MS) ultimaEscritura.delete(sn);
    }
  }
  ultimaEscritura.set(DeviceSN, ahora);
}

function olvidar(DeviceSN) {
  ultimaEscritura.delete(DeviceSN);
}

function limpiar() {
  ultimaEscritura.clear();
}

module.exports = {
  INTERVALO_ESCRITURA_MS,
  debeEscribir,
  marcarEscritura,
  olvidar,
  limpiar,
};
