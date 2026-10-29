const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

// Orden de los meses en el reporte comparativo-mensual-ventas.
// mes: 0 = enero ... 11 = diciembre
const OrdenMesComparativo = db.define(
  "tb_orden_mes_comparativo",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    anio: {
      type: DataTypes.INTEGER,
    },
    mes: {
      type: DataTypes.INTEGER,
    },
    orden: {
      type: DataTypes.INTEGER,
    },
  },
  { tableName: "tb_orden_mes_comparativo" },
);

OrdenMesComparativo.sync()
  .then(() => {
    console.log("La tabla OrdenMesComparativo ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: OrdenMesComparativo",
      error,
    );
  });

module.exports = { OrdenMesComparativo };
