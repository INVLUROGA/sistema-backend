const { DataTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Parametros } = require("./Parametros");
const { Proveedor } = require("./Proveedor");
const Producto = db.define(
  "tb_producto",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    uid: {
      type: DataTypes.STRING,
    },
    id_marca: {
      type: DataTypes.INTEGER,
    },
    id_categoria: {
      type: DataTypes.INTEGER,
    },
    id_presentacion: {
      type: DataTypes.INTEGER,
    },
    codigo_lote: {
      type: DataTypes.STRING(10),
    },
    codigo_producto: {
      type: DataTypes.STRING(15),
    },
    codigo_contable: {
      type: DataTypes.STRING(15),
    },
    id_prov: {
      type: DataTypes.INTEGER,
    },
    nombre_producto: {
      type: DataTypes.STRING(250),
    },
    prec_venta: {
      type: DataTypes.DECIMAL(10, 2),
    },
    prec_compra: {
      type: DataTypes.DECIMAL(10, 2),
    },
    stock_minimo: {
      type: DataTypes.STRING(3),
    },
    stock_producto: {
      type: DataTypes.STRING(6),
    },
    ubicacion_producto: {
      type: DataTypes.STRING(150),
    },
    descripcion: {
      type: DataTypes.STRING(450),
    },
    fec_vencimiento: {
      type: DataTypes.DATE,
    },
    estado_product: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    id_empresa: {
      type: DataTypes.INTEGER,
    },
    flag: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  { tableName: "tb_producto" }
);

Producto.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_categoria",
  as: "objCategoria",
});
Producto.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_marca",
  as: "objMarca",
});
Producto.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_presentacion",
  as: "objPresentacion",
});
Producto.hasOne(Proveedor, {
  foreignKey: "id",
  sourceKey: "id_prov",
  as: "objProveedor",
});
Producto.sync()
  .then(() => {
    console.log("La tabla Producto ha sido sincronizada.");
  })
  .catch((error) => {
    console.error(
      "Error al sincronizar el modelo con la base de datos: Producto",
      error
    );
  });

module.exports = {
  Producto,
};
