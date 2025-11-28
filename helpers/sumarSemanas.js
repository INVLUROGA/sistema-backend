const sumarSemanas = (fecha, semanas) => {
  // Convertir la cadena de fecha a un objeto Date si es una cadena
  if (typeof fecha === "string") {
    fecha = new Date(fecha);
  }

  // Calcular el tiempo en milisegundos de las semanas a sumar
  const tiempoSemanas = semanas * 7 * 24 * 60 * 60 * 1000;

  // Calcular la nueva fecha sumando el tiempo de las semanas
  const nuevaFecha = new Date(fecha.getTime() + tiempoSemanas);

  return nuevaFecha.toISOString().split("T")[0];
};

module.exports = sumarSemanas;
