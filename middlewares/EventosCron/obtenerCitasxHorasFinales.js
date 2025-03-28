const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const isBetween = require("dayjs/plugin/isBetween"); // Importa el plugin
dayjs.extend(utc);
dayjs.extend(isBetween); // Extiende dayjs con el plugin
const obtenerCitasxHorasFinales = (tiempo, fecha, dataFiltered) => {
  try {
    // Convertir la fecha de referencia a UTC
    const referenciaUTC = dayjs.utc(fecha);
    let horaObjetivoUTC;
    const tiempoLower = tiempo.toLowerCase();

    // Verificar si el tiempo termina en 'min' o 'h'
    if (tiempoLower.endsWith("min")) {
      // Extraer el valor numérico y sumar minutos
      const minutos = parseInt(tiempoLower.replace("min", ""));
      horaObjetivoUTC = referenciaUTC.add(minutos, "minute");
    } else if (tiempoLower.endsWith("h")) {
      // Extraer el valor numérico y sumar horas
      const horas = parseInt(tiempoLower.replace("h", ""));
      horaObjetivoUTC = referenciaUTC.add(horas, "hour");
    } else {
      throw new Error("Formato de tiempo no válido");
    }

    // Definir el rango exacto del minuto objetivo
    const desde = horaObjetivoUTC.startOf("minute");
    const hasta = horaObjetivoUTC.endOf("minute");

    // Filtrar las citas que comienzan dentro del rango especificado
    const citasProximas = dataFiltered.filter((cita) => {
      const inicioCitaUTC = dayjs.utc(cita.fecha_init);
      return inicioCitaUTC.isBetween(desde, hasta, null, "[]");
    });

    return citasProximas;
  } catch (error) {
    console.log(error);
  }
};

module.exports = obtenerCitasxHorasFinales;
