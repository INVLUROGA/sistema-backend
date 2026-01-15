function fechasAnteriores(fechaBase, cantidad) {
  const hoy = new Date();
  const anioActual = hoy.getFullYear();

  // Extraemos mes y día de la fecha base
  const [, mes, dia] = fechaBase?.split("-");

  // Creamos la fecha base con el año actual
  const base = new Date(`${anioActual}-${mes}-${dia}`);

  return Array.from({ length: cantidad }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    return d.toISOString().split("T")[0];
  });
}
module.exports = {
  fechasAnteriores,
};
