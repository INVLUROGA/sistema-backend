const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Cliente } = require("./Usuarios");
const { detalleVenta_membresias } = require("./Venta");
const TurnoGimnasio = require("./TurnoGimnasio");

const Asistencia = db.define(
    "Asistencia",
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
        id_detalle_membresia: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: detalleVenta_membresias,
                key: 'id'
            }
        },
        id_turno: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: TurnoGimnasio,
                key: 'id'
            }
        },
        fecha_ingreso: {
            type: DataTypes.DATEONLY,
            defaultValue: DataTypes.NOW,
        },

        metodo_ingreso: {
            type: DataTypes.STRING(50),
            defaultValue: 'MANUAL',
            validate: {
                isIn: [['MANUAL', 'QR', 'SISTEMA', 'SISTEMA_TURNO']]
            }
        },
        estado: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    },
    {
        tableName: "tb_asistencia",
        timestamps: false, // El motor de la BD tiene DEFAULT getdate()
    }
);


// Associations
Asistencia.belongsTo(Cliente, { foreignKey: "id_cliente", targetKey: "id_cli" });
Cliente.hasMany(Asistencia, { foreignKey: "id_cliente", sourceKey: "id_cli" });

Asistencia.belongsTo(detalleVenta_membresias, { foreignKey: "id_detalle_membresia", targetKey: "id" });
detalleVenta_membresias.hasMany(Asistencia, { foreignKey: "id_detalle_membresia", sourceKey: "id" });
Asistencia.belongsTo(TurnoGimnasio, { foreignKey: "id_turno", targetKey: "id" });
/*
Asistencia.sync({ alter: true })
    .then(() => console.log("Tabla tb_asistencia sincronizada"))
    .catch((err) => console.error("Error sincronizando tb_asistencia:", err));
*/

module.exports = Asistencia;
