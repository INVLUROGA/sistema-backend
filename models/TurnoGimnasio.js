const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");

const TurnoGimnasio = db.define(
    "TurnoGimnasio",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        nombre: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        hora_inicio: {
            type: DataTypes.TIME,
            allowNull: true,
        },
        hora_fin: {
            type: DataTypes.TIME,
            allowNull: true,
        },
        estado: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        }
    },
    {
        tableName: "tb_turnos_gimnasio",
        timestamps: false, // Desactivamos timestamps automáticos para evitar error 500 con formato de fecha
    }
);

TurnoGimnasio.sync()
    .then(() => console.log("Tabla tb_turnos_gimnasio sincronizada"))
    .catch((err) => console.error("Error sincronizando tb_turnos_gimnasio:", err));

module.exports = TurnoGimnasio;
