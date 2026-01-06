const { request, response } = require("express");
const { Producto } = require("../models/Producto");
const uid = require("uuid");
const { eliminarCaracter } = require("../helpers/isFormat");
const { Parametros } = require("../models/Parametros");
const { Proveedor } = require("../models/Proveedor");

// === CREAR PRODUCTO ===
const postProducto = async (req = request, res = response) => {
  try {
    const { id_empresa } = req.params;
    const producto = new Producto({ ...req.body, id_empresa });
    await producto.save();
    res.status(200).json(producto);
  } catch (error) {
    console.error("Error postProducto:", error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema",
    });
  }
};

const getProductosxEmpresa = async (req = request, res = response) => {
  try {
    const { id_empresa } = req.params;
    const producto = await Producto.findAll({
      where: {
        flag: true,
        id_empresa: id_empresa,
      },
      order: [["id", "DESC"]],
      include: [
        {
          model: Parametros,
          as: "objMarca",
        },
        {
          model: Parametros,
          as: "objCategoria",
        },
        {
          model: Parametros,
          as: "objPresentacion",
        },
        {
          model: Proveedor,
          as: "objProveedor",
        },
      ],
    });

    res.status(200).json({
      msg: true,
      producto,
    });
  } catch (error) {
    console.error("Error getTBProductos:", error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema, getTBProductos",
    });
  }
};

// === OBTENER UN PRODUCTO ===
const getProducto = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const producto = await Producto.findOne({
      where: { id: id, flag: true },
    });

    if (!producto) {
      return res.status(404).json({
        ok: false,
        msg: "El producto no existe o fue eliminado",
      });
    }

    res.status(200).json({
      ok: true,
      producto,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema (getProducto)",
    });
  }
};

// === ACTUALIZAR PRODUCTO (CORREGIDO ERROR 500) ===
const updateProducto = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const producto = await Producto.findByPk(id);

    if (!producto) {
      return res.status(404).json({
        ok: false,
        msg: "El producto no existe",
      });
    }

    await producto.update(req.body);

    res.status(200).json({
      ok: true,
      msg: "Producto actualizado correctamente",
      producto,
    });
  } catch (error) {
    console.error("Error updateProducto:", error); // Esto imprimirá el error real en tu consola backend
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema (updateProducto)",
      error: error.message, // Enviamos el detalle para que veas qué pasa en Postman
    });
  }
};

// === ELIMINAR PRODUCTO ===
const deleteProducto = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const producto = await Producto.findByPk(id);

    if (!producto) {
      return res.status(404).json({
        ok: false,
        msg: "El producto no existe",
      });
    }
    await producto.update({ flag: false });
    res.status(200).json({
      ok: true,
      msg: "Producto eliminado correctamente",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema (deleteProducto)",
    });
  }
};
const obtenerSeleccionableActivos = async (req = request, res = response) => {
  try {
    const { id_empresa } = req.params;
    const productos = await Producto.findAll({
      where: {
        flag: true,
        id_empresa: id_empresa, 
        estado_product: true,
      },
      order: [["id", "DESC"]],
      attributes: [
        ["id", "value"],
        ["nombre_producto", "label"],
        ["prec_venta", "prec_venta"],
        ["id_categoria", "id_cat"],
      ],
    });
    res.status(200).json({
      msg: true,
      productos,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema (deleteProducto)",
    });
  }
};
module.exports = {
  postProducto,
  getProducto,
  getProductosxEmpresa,
  updateProducto,
  deleteProducto,
  obtenerSeleccionableActivos,
};
