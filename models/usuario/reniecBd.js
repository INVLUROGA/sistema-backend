const { DataTypes } = require("sequelize");
const { db } = require("../../database/sequelizeConnection");

const bdBusquedaDni = db.define("tb_bd_busqueda_dni", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  dni: {
    type: DataTypes.STRING(10),
  },
  nombres: {
    type: DataTypes.STRING(250),
  },
  apellido_paterno: {
    type: DataTypes.STRING(250),
  },
  apellido_materno: {
    type: DataTypes.STRING(250),
  },
  fecha_nacimiento: {
    type: DataTypes.STRING(20),
  },
  sexo: {
    type: DataTypes.STRING(1),
  },
  direccion: {
    type: DataTypes.STRING(580),
  },
  ubigeo: {
    type: DataTypes.STRING(10),
  },
  distrito: {
    type: DataTypes.STRING(280),
  },
  provincia: {
    type: DataTypes.STRING(180),
  },
  departamento: {
    type: DataTypes.STRING(100),
  },
});

const bdBusquedaRuc = db.define("tb_bd_busqueda_ruc", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  ruc: {
    type: DataTypes.STRING(90),
  },
  razon_social: {
    type: DataTypes.STRING(24),
  },
  activo: {
    type: DataTypes.STRING(10),
  },
  condicion: {
    type: DataTypes.STRING(15),
  },
  direccion: {
    type: DataTypes.STRING(250),
  },
  ubigeo: {
    type: DataTypes.STRING(9),
  },
  distrito: {
    type: DataTypes.STRING(50),
  },
  provincia: {
    type: DataTypes.STRING(30),
  },
  departamento: {
    type: DataTypes.STRING(90),
  },
  fecha_inscripcion: {
    type: DataTypes.STRING(15),
  },
  ciiu: {
    type: DataTypes.STRING(250),
  },
});

const bdDocBusqueda = db.define("tb_bd_busqueda", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  doc: {
    type: DataTypes.STRING(90),
  },
  tipo_doc: {
    type: DataTypes.STRING(24),
  },
});

bdDocBusqueda
  .sync()
  .then(() => {
    console.log("La tabla bdDocBusqueda ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });
bdBusquedaRuc
  .sync()
  .then(() => {
    console.log("La tabla bdBusquedaRuc ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });
bdBusquedaDni
  .sync()
  .then(() => {
    console.log("La tabla bdBusquedaDni ha sido creada o ya existe.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos:",
      error
    );
  });
module.exports = {
  bdBusquedaRuc,
  bdBusquedaDni,
  bdDocBusqueda,
};
