const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

// Activar los plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const FunctionsHelpers = () => {
  const calcularMinutos = (dataArray, fechaReferenciaStr) => {
    const fechaReferencia = transformarFecha(fechaReferenciaStr);

    return dataArray.map((obj) => {
      const fechaAlerta = transformarFecha(obj.fecha);
      const diffMs = fechaAlerta - fechaReferencia;
      const diffMins = Math.round(diffMs / 60000);
      const yaPaso = diffMins < 0;

      // Convertir a formato legible
      const absMins = Math.abs(diffMins);
      const horas = Math.floor(absMins / 60);
      const minutos = absMins % 60;
      const textoTiempo = yaPaso
        ? `pasaron ${horas}h ${minutos}min`
        : `faltan ${horas}h ${minutos}min`;

      return {
        ...obj,
        tiempoEnMins: diffMins,
        yaPaso,
        tiempoLegible: textoTiempo,
      };
    });
  };
  const transformarFecha = (date) => {
    return dayjs.utc(date).tz("America/Lima");
  };

  return {
    calcularMinutos,
  };
};

module.exports = {
  FunctionsHelpers,
};
