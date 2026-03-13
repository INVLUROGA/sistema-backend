const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Venta } = require("./Venta");
const { Cliente } = require("./Usuarios");

const ResultadosReto = db.define(
    "tb_resultados_reto",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        id_venta: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: Venta,
                key: 'id'
            }
        },
        id_cliente: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: Cliente,
                key: 'id_cli'
            }
        },
        peso_inicial: {
            type: DataTypes.DECIMAL(10, 2),
        },
        peso_final: {
            type: DataTypes.DECIMAL(10, 2),
        },
        grasa_inicial: {
            type: DataTypes.DECIMAL(10, 2),
        },
        grasa_final: {
            type: DataTypes.DECIMAL(10, 2),
        },
        musculo_inicial: {
            type: DataTypes.DECIMAL(10, 2),
        },
        musculo_final: {
            type: DataTypes.DECIMAL(10, 2),
        },
        foto_inicial: {
            type: DataTypes.TEXT,
        },
        foto_inicio_frontal: {
            type: DataTypes.TEXT, // NUEVO
        },
        foto_final: {
            type: DataTypes.TEXT,
        },
        foto_fin_frontal: {
            type: DataTypes.TEXT, // NUEVO
        },
        fecha_registro_inicial: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        fecha_registro_final: {
            type: DataTypes.DATE,
        },
        comentarios: {
            type: DataTypes.STRING(500),
        },
        flag: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    },
    {
        tableName: "tb_resultados_reto",
        timestamps: false,
    }
);

ResultadosReto.belongsTo(Venta, { foreignKey: "id_venta", targetKey: "id" });
ResultadosReto.belongsTo(Cliente, { foreignKey: "id_cliente", targetKey: "id_cli" });

// ResultadosReto.sync({ alter: true })
//     .then(() => console.log("Tabla tb_resultados_reto sincronizada"))
//     .catch((err) => console.error("Error sincronizando tb_resultados_reto:", err));

module.exports = { ResultadosReto };
