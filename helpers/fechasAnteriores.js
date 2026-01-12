function fechasAnteriores(fechaBase, cantidad) {
  const base = new Date(fechaBase);

  return Array.from({ length: cantidad }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    return d.toISOString().split("T")[0];
  });
}
module.exports = {
  fechasAnteriores,
};
