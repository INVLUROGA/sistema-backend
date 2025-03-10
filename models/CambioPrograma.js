const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

const CambioPrograma = db.define("tb_cambioPrograma", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  uid_cli: {
    //el uid del cliente que va a cambiar de programa
    type: DataTypes.STRING,
  },
  id_venta: {
    // la venta que tenga detalle_membresia para que el cliente cambie de programa
    type: DataTypes.INTEGER,
  },
  id_motivo: {
    // sesiones
    type: DataTypes.INTEGER,
  },
  fecha_entrada: {
    type: DataTypes.DATEONLY,
  },
  observacion: {
    type: DataTypes.STRING(900),
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});


// CambioPrograma.sync()
//   .then(() => {
//     console.log("La tabla CambioPrograma ha sido creada o ya existe.");
//   })
//   .catch((error) => {
//     console.error(
//       "Error al sincronizar el modelo con la base de datos:",
//       error
//     );
//   });
module.exports = {
  CambioPrograma,
};
