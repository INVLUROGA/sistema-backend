const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const TipoEjercicio = require("./TipoEjercicio");

const CatalogoEntrenamiento = db.define(
    "CatalogoEntrenamiento",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        nombre: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        descripcion: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        id_tipo: {
            type: DataTypes.INTEGER,
            references: {
                model: TipoEjercicio,
                key: 'id'
            }
        },
        url_video: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        es_maquina: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        }
    },
    {
        tableName: "tb_catalogo_entrenamientos",
        timestamps: false,
    }
);

CatalogoEntrenamiento.belongsTo(TipoEjercicio, { foreignKey: "id_tipo", targetKey: "id" });
TipoEjercicio.hasMany(CatalogoEntrenamiento, { foreignKey: "id_tipo", sourceKey: "id" });

/*
CatalogoEntrenamiento.sync({ alter: true })
    .then(() => console.log("Tabla tb_catalogo_entrenamientos sincronizada"))
    .catch((err) => console.error("Error sincronizando tb_catalogo_entrenamientos:", err));
*/

module.exports = CatalogoEntrenamiento;
