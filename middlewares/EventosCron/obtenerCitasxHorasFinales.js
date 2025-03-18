const obtenerCitasxHorasFinales = (horas, fecha, dataFiltered) => {
  try {
    // Creamos una copia de la fecha y le sumamos las horas
    const target = new Date(fecha);
    target.setHours(target.getHours() + horas);

    // Extraemos las partes relevantes de la fecha objetivo
    const targetYear = target.getFullYear();
    const targetMonth = target.getMonth();
    const targetDay = target.getDate();
    const targetHour = target.getHours();

    // Filtramos el array comparando solo año, mes, día y hora
    return dataFiltered.filter((obj) => {
      const fechaInit = new Date(obj.fecha_init);
      return (
        fechaInit.getFullYear() === targetYear &&
        fechaInit.getMonth() === targetMonth &&
        fechaInit.getDate() === targetDay &&
        fechaInit.getHours() === targetHour
      );
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = obtenerCitasxHorasFinales;
