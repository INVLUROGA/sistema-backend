const dayjs = require("dayjs");

const DateMask = (fecha, formatoRetorno, formatoFecha) => {
  return dayjs.utc(fecha, formatoFecha).format(formatoRetorno);
};

module.exports = {
  DateMask,
};
