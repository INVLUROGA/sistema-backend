const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

const TipoEjercicio = db.define(
    "TipoEjercicio",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        nombre: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        usa_peso: {
            type: DataTypes.BOOLEAN, // 1 = Sí, 0 = No
            defaultValue: true,
        },
        usa_tiempo: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    },
    {
        tableName: "tb_tipo_ejercicio",
        timestamps: false,
    }
);

/*
TipoEjercicio.sync({ alter: true })
    .then(() => console.log("Tabla tb_tipo_ejercicio sincronizada"))
    .catch((err) => console.error("Error sincronizando tb_tipo_ejercicio:", err));
*/

module.exports = TipoEjercicio;
