const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const CatalogoEntrenamiento = require("./CatalogoEntrenamientos");
const { ProgramaTraining } = require("./ProgramaTraining");
const TurnoGimnasio = require("./TurnoGimnasio");

const { Cliente } = require("./Usuarios");

const HistorialEntrenamiento = db.define(
    "HistorialEntrenamiento",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        id_cliente: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: Cliente,
                key: 'id_cli'
            }
        },
        id_entrenamiento: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: CatalogoEntrenamiento,
                key: 'id'
            }
        },
        id_pgm: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: ProgramaTraining,
                key: 'id_pgm'
            }
        },
        id_detalle_membresia: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'detalle_ventaMembresia',
                key: 'id'
            }
        },
        fecha: {
            type: DataTypes.DATEONLY,
            defaultValue: DataTypes.NOW,
            get() {
                const rawValue = this.getDataValue('fecha');
                if (!rawValue) return null;
                // Force UTC date string to avoid timezone parsing issues with MSSQL driver
                const d = new Date(rawValue);
                // If invalid date, return raw
                if (isNaN(d.getTime())) return rawValue;
                // Return YYYY-MM-DD part of ISO string (which uses UTC)
                return d.toISOString().split('T')[0];
            }
        },
        flag: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        series: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        repeticiones: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        peso: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
        },
        tiempo: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        id_turno: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: TurnoGimnasio,
                key: 'id'
            }
        },
        date_edit_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        comentario: {
            type: DataTypes.STRING(DataTypes.MAX), // or TEXT
            allowNull: true
        }
    },
    {
        tableName: "tb_historial_entrenamientos",
        timestamps: false,
    }
);

HistorialEntrenamiento.belongsTo(Cliente, { foreignKey: "id_cliente", targetKey: "id_cli" });
Cliente.hasMany(HistorialEntrenamiento, { foreignKey: "id_cliente", sourceKey: "id_cli" });

HistorialEntrenamiento.belongsTo(CatalogoEntrenamiento, { foreignKey: "id_entrenamiento", targetKey: "id" });
CatalogoEntrenamiento.hasMany(HistorialEntrenamiento, { foreignKey: "id_entrenamiento", sourceKey: "id" });

HistorialEntrenamiento.belongsTo(ProgramaTraining, { foreignKey: "id_pgm", targetKey: "id_pgm" });
ProgramaTraining.hasMany(HistorialEntrenamiento, { foreignKey: "id_pgm", sourceKey: "id_pgm" });

HistorialEntrenamiento.belongsTo(TurnoGimnasio, { foreignKey: "id_turno", targetKey: "id" });
TurnoGimnasio.hasMany(HistorialEntrenamiento, { foreignKey: "id_turno", sourceKey: "id" });

// Relación con detalleVenta_membresias para rastrear el plan específico
const { detalleVenta_membresias } = require("./Venta");
HistorialEntrenamiento.belongsTo(detalleVenta_membresias, { foreignKey: "id_detalle_membresia", targetKey: "id" });
detalleVenta_membresias.hasMany(HistorialEntrenamiento, { foreignKey: "id_detalle_membresia", sourceKey: "id" });


/*
HistorialEntrenamiento.sync({ alter: true })
    .then(() => console.log("Tabla tb_historial_entrenamientos sincronizada"))
    .catch((err) => console.error("Error sincronizando tb_historial_entrenamientos:", err));
*/

module.exports = HistorialEntrenamiento;
