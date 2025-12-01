const { request, response } = require("express");
const { Producto } = require("../models/Producto");
const uid = require("uuid");
const { eliminarCaracter } = require("../helpers/isFormat");

// === CREAR PRODUCTO ===
const postProducto = async (req = request, res = response) => {
  const {
    id_marca,
    id_categoria,
    id_presentacion,
    codigo_lote,
    codigo_producto,
    codigo_contable,
    id_prov,
    nombre_producto,
    prec_venta,
    prec_compra,
    stock_minimo,
    stock_producto,
    ubicacion_producto,
    fec_vencimiento,
    estado_producto,
    // id_empresa, // Si lo envías desde el front, úsalo. Si no, fíjalo abajo.
  } = req.body;

  try {
    const producto = new Producto({
      uid: uid.v4(),
      id_marca,
      id_categoria,
      id_presentacion,
      codigo_lote,
      codigo_producto,
      codigo_contable,
      id_prov,
      nombre_producto,
      prec_venta: eliminarCaracter(prec_venta, ","),
      prec_compra: eliminarCaracter(prec_compra, ","),
      stock_minimo,
      stock_producto,
      ubicacion_producto,
      fec_vencimiento,
      estado_product: estado_producto !== undefined ? estado_producto : true,
      id_empresa: 599, // <--- FIJAMOS LA EMPRESA 599 AQUÍ TAMBIÉN POR SEGURIDAD
    });

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

const getTBProductos = async (req = request, res = response) => {
  try {
    const producto = await Producto.findAll({
      where: { 
        flag: true, 
        id_empresa: 599 
      },
      attributes: [
        "id", 
        "uid",
        "nombre_producto",
        "prec_venta", 
        "prec_compra",
        "stock_producto", 
        "stock_minimo",
        "codigo_producto", 
        "codigo_lote", 
        "codigo_contable",
        "ubicacion_producto",
        "fec_vencimiento",  // <--- CRUCIAL PARA QUE CARGUE LA FECHA
        "id_marca",         // <--- CRUCIAL PARA EL SELECT DE MARCA
        "id_categoria",     // <--- CRUCIAL PARA EL SELECT DE CATEGORÍA
        "id_presentacion",
        "id_prov",
        ["estado_product", "estado"], // Alias para usar 'estado' en la tabla
        "estado_product"              // El valor real para el switch del modal
      ],
      order: [['id', 'DESC']]
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
      where: { id: id, flag: true }
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
    
    // Desestructuramos para sacar 'id' y 'uid' del body para NO actualizarlos
    const { 
      id: idBody,   // Lo sacamos para evitar error de PK
      uid: uidBody, // Lo sacamos para no cambiar el UID
      prec_venta, 
      prec_compra, 
      ...restoCampos 
    } = req.body;

    const producto = await Producto.findByPk(id);

    if (!producto) {
      return res.status(404).json({
        ok: false,
        msg: "El producto no existe",
      });
    }

    const dataUpdate = {
      ...restoCampos, // Aquí ya no va el 'id', evitando el error 500
      prec_venta: prec_venta ? eliminarCaracter(String(prec_venta), ",") : producto.prec_venta,
      prec_compra: prec_compra ? eliminarCaracter(String(prec_compra), ",") : producto.prec_compra,
    };

    await producto.update(dataUpdate);

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
      error: error.message // Enviamos el detalle para que veas qué pasa en Postman
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

    // Eliminación lógica (Soft Delete)
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

module.exports = {
  postProducto,
  getProducto,
  getTBProductos,
  updateProducto,
  deleteProducto,
};