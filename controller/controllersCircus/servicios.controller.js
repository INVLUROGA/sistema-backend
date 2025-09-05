const { response, request } = require("express");
const { VentaTem } = require("../../models/modelsCircus/DataVentaTemporal");
const { ServiciosCircus } = require("../../models/modelsCircus/Servicios");
const { Parametros } = require("../../models/Parametros");
const { Servicios } = require("../../models/Servicios");
const { Op, Sequelize, fn, col } = require("sequelize");
const { Producto } = require("../../models/Producto");
const {
  Venta,
  detalleVenta_producto,
  detalleventa_servicios,
} = require("../../models/Venta");
const { Empleado, Cliente } = require("../../models/Usuarios");

const obtenerProductosActivos = async (req, res) => {
  const { id_empresa } = req.params;
  try {
    const productos = await Producto.findAll({
      attributes: ["id", "uid", "nombre_producto", "prec_venta", "prec_compra"],
      where: {
        id_empresa: id_empresa,
        estado_product: true,
        flag: true,
      },
    });

    res.status(200).json({
      msg: "success",
      productos,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: `Error en el servidor, en controller de obtenerProductosActivos, hable con el administrador: ${error}`,
    });
  }
};
const obtenerServiciosActivos = async (req, res) => {
  try {
    const servicios = await ServiciosCircus.findAll({
      where: { flag: true },
      include: [
        {
          model: Parametros,
        },
      ],
    });

    res.status(200).json({
      msg: "success",
      servicios,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: `Error en el servidor, en controller de postGasto, hable con el administrador: ${error}`,
    });
  }
};
const obtenerVentasTemporales = async (req = request, res = response) => {
  const { arrayDate } = req.query;
  const fechaInicio = arrayDate[0];
  const fechaFin = arrayDate[1];
  try {
    const ventasTem = await VentaTem.findAll({
      where: {
        fecha: {
          [Op.between]: [
            new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
            new Date(fechaFin).setUTCHours(23, 59, 59, 999),
          ],
        },
      },
    });
    const ventasCircus = await Venta.findAll({
      attributes: [
        "id",
        "fecha_venta", // ...
      ],
      include: [
        {
          model: Cliente,
          as: "tb_cliente",
          attributes: [
            "id_cli",
            // califica también por prolijidad
            [
              fn(
                "CONCAT",
                col("tb_cliente.nombre_cli"),
                " ",
                col("tb_cliente.apPaterno_cli"),
                " ",
                col("tb_cliente.apMaterno_cli")
              ),
              "nombres_apellidos_cli",
            ],
          ],
          required: false,
        },
        {
          model: detalleVenta_producto,
          as: "detalle_ventaProductos",
          attributes: ["id", "cantidad", "tarifa_monto"],
          include: [
            {
              model: Producto,
              as: "tb_producto",
              attributes: [
                "id",
                "id_categoria",
                "nombre_producto",
                "prec_venta",
              ],
              required: false,
            },
            {
              model: Empleado,
              as: "empleado_producto",
              attributes: [
                "id_empl",
                [
                  fn(
                    "CONCAT",
                    col("detalle_ventaProductos.empleado_producto.nombre_empl"),
                    " ",
                    col(
                      "detalle_ventaProductos.empleado_producto.apPaterno_empl"
                    ),
                    " ",
                    col(
                      "detalle_ventaProductos.empleado_producto.apMaterno_empl"
                    )
                  ),
                  "nombres_apellidos_empl",
                ],
              ],
              required: false,
            },
          ],
          required: false,
        },
        {
          model: detalleventa_servicios,
          as: "detalle_ventaservicios",
          attributes: [
            "id",
            "id_empl",
            "id_servicio",
            "cantidad",
            "tarifa_monto",
          ],
          include: [
            {
              model: ServiciosCircus,
              as: "circus_servicio",
              attributes: ["id", "id_categoria", "nombre_servicio", "precio"],
              required: false,
            },
            {
              model: Empleado,
              as: "empleado_servicio",
              attributes: [
                "id_empl",
                [
                  fn(
                    "CONCAT",
                    col("detalle_ventaservicios.empleado_servicio.nombre_empl"),
                    " ",
                    col(
                      "detalle_ventaservicios.empleado_servicio.apPaterno_empl"
                    ),
                    " ",
                    col(
                      "detalle_ventaservicios.empleado_servicio.apMaterno_empl"
                    )
                  ),
                  "nombres_apellidos_empl",
                ],
              ],
              required: false,
            },
          ],
          required: false,
        },
      ],
      where: {
        id_empresa: 599,
        flag: true,
        fecha_venta: {
          [Op.between]: [fechaInicio, fechaFin], // JS Date o string sin zona
        },
      },
    });
    res.status(201).json({
      ventasTem,
      ventasCircus,
    });
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  obtenerServiciosActivos,
  obtenerVentasTemporales,
  obtenerProductosActivos,
};
