const { request, response } = require("express");
const {
  Gastos,
  ParametroGastos,
  ParametroGrupo,
} = require("../models/GastosFyV");
const { Proveedor } = require("../models/Proveedor");
const { Sequelize, Op } = require("sequelize");
const { Parametros } = require("../models/Parametros");
const { capturarAUDIT } = require("../middlewares/auditoria");
const { typesCRUD } = require("../types/types");

const postGasto = async (req = request, res = response) => {
  try {
    const gasto = new Gastos(req.body);
    await gasto.save();
    let formAUDIT = {
      id_user: req.id_user,
      ip_user: req.ip_user,
      accion: typesCRUD.POST,
      observacion: `Se registro: El gasto de id ${gasto.id}`,
    };
    await capturarAUDIT(formAUDIT);
    res.status(200).json({
      msg: "success",
      gasto,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: `Error en el servidor, en controller de postGasto, hable con el administrador: ${error}`,
    });
  }
};
const getGastos = async (req = request, res = response) => {
  const { id_enterp } = req.params;
  try {
    const gastos = await Gastos.findAll({
      where: {
        flag: true,
        [Sequelize.Op.and]: Sequelize.where(
          Sequelize.fn("YEAR", Sequelize.col("fec_comprobante")),
          "<",
          2030,
        ),
        id: {
          [Sequelize.Op.not]: 2548,
        },
      },
      order: [["updatedAt", "desc"]],
      attributes: [
        "id",
        "moneda",
        "monto",
        "fec_pago",
        "monto_venta_cliente",
        "id_tipo_comprobante",
        "n_comprabante",
        "impuesto_igv",
        "impuesto_renta",
        "n_operacion",
        "fec_registro",
        "fec_comprobante",
        "descripcion",
        "id_prov",
        "cod_trabajo",
        "id_estado_gasto",
      ],
      include: [
        {
          model: Proveedor,
          attributes: ["razon_social_prov"],
        },
        {
          model: ParametroGastos,
          attributes: ["id_empresa", "nombre_gasto", "grupo", "id_tipoGasto"],
          where: {
            id_empresa: id_enterp,
          },
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_banco",
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_forma_pago",
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_comprobante",
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "estado_gasto",
        },
      ],
    });
    res.status(200).json({
      msg: "success",
      gastos,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de getGastos, hable con el administrador: ${error}`,
    });
  }
};
const getProveedoresGastos_SinRep = async (req = request, res = response) => {
  try {
    const proveedoresUnicos = await Gastos.findAll({
      attributes: [
        "id_prov",
        [Sequelize.fn("COUNT", Sequelize.col("*")), "count"],
        [
          Sequelize.literal('MAX("tb_Proveedor"."razon_social_prov")'),
          "razon_social_prov",
        ], // Corregido
      ],
      include: [
        {
          model: Proveedor,
          attributes: [],
        },
      ],
      group: ["id_prov"],
      having: Sequelize.literal("COUNT(*) > 1"),
    });
    res.status(200).json({
      msg: "success",
      proveedoresUnicos,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: error,
    });
  }
};
const getGasto = async (req = request, res = response) => {
  const { id } = req.params;
  try {
    const gasto = await Gastos.findOne({
      where: { flag: true, id },
      attributes: [
        "id",
        "id_gasto",
        "grupo",
        "moneda",
        "monto",
        "id_tipo_comprobante",
        "n_comprabante",
        "impuesto_igv",
        "impuesto_renta",
        "fec_pago",
        "fec_comprobante",
        "id_forma_pago",
        "id_banco_pago",
        "n_operacion",
        "id_rubro",
        "descripcion",
        "id_prov",
        "cod_trabajo",
        "esCompra",
        "id_estado_gasto",
        "monto_venta_cliente",
        "id_contrato_prov",
      ],
    });
    res.status(200).json({
      msg: "success",
      gasto,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de getGastos, hable con el administrador: ${error}`,
    });
  }
};
const putGasto = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const gasto = await Gastos.findOne({ where: { flag: true, id } });
    await gasto.update(req.body);
    let formAUDIT = {
      id_user: req.id_user,
      ip_user: req.ip_user,
      accion: typesCRUD.PUT,
      observacion: `Se actualizo: El gasto de id ${gasto.id}`,
    };
    await capturarAUDIT(formAUDIT);
    res.status(200).json({
      msg: "success",
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de putGasto, hable con el administrador: ${error}`,
    });
  }
};
const deleteGasto = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const gasto = await Gastos.findByPk(id);
    await gasto.update({ flag: false });
    let formAUDIT = {
      id_user: req.id_user,
      ip_user: req.ip_user,
      accion: typesCRUD.DELETE,
      observacion: `Se elimino: El gasto de id ${gasto.id}`,
    };
    await capturarAUDIT(formAUDIT);
    res.status(200).json({
      msg: "success",
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de putGasto, hable con el administrador: ${error}`,
    });
  }
};
const obtenerOrdenCompra = async (req = request, res = response) => {
  const { id_enterp } = req.params;
  try {
    const gastos = await Gastos.findAll({
      where: {
        flag: true,
        [Sequelize.Op.and]: Sequelize.where(
          Sequelize.fn("YEAR", Sequelize.col("fec_comprobante")),
          "<",
          2030,
        ),
        esCompra: true,
        id: {
          [Sequelize.Op.not]: 2548,
        },
      },
      order: [["fec_registro", "desc"]],
      attributes: [
        "id",
        "moneda",
        "monto",
        "fec_pago",
        "id_tipo_comprobante",
        "n_comprabante",
        "impuesto_igv",
        "impuesto_renta",
        "n_operacion",
        "fec_registro",
        "fec_comprobante",
        "descripcion",
        "id_prov",
        "cod_trabajo",
        "esCompra",
      ],
      include: [
        {
          model: Proveedor,
          attributes: ["razon_social_prov"],
        },
        {
          model: ParametroGastos,
          attributes: ["id_empresa", "nombre_gasto", "grupo", "id_tipoGasto"],
          where: {
            id_empresa: id_enterp,
          },
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_banco",
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_forma_pago",
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_comprobante",
        },
      ],
    });
    res.status(200).json({
      msg: "success",
      gastos,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: `Error en el servidor, en controller de getGastos, hable con el administrador: ${error}`,
    });
  }
};
const getGastoxGrupo = async (req = request, res = response) => {
  const { anio } = req.query;
  const { id_enterp } = req.params;
  try {
    const gastos = await Gastos.findAll({
      where: {
        flag: true,
        [Sequelize.Op.and]: Sequelize.where(
          Sequelize.fn("YEAR", Sequelize.col("fec_comprobante")),
          "<",
          2030,
        ),
        id: {
          [Sequelize.Op.not]: 2548,
        },
      },
      order: [["fec_registro", "desc"]],
      attributes: [
        "id",
        "moneda",
        "monto",
        "fec_pago",
        "id_tipo_comprobante",
        "n_comprabante",
        "impuesto_igv",
        "impuesto_renta",
        "n_operacion",
        "fec_registro",
        "fec_comprobante",
        "descripcion",
        "id_prov",
        "cod_trabajo",
        "id_estado_gasto",
        "monto_venta_cliente",
        "",
      ],
      include: [
        {
          model: Proveedor,
          attributes: ["razon_social_prov"],
        },
        {
          model: ParametroGastos,
          attributes: ["id_empresa", "nombre_gasto", "grupo", "id_tipoGasto"],
          where: {
            id_empresa: id_enterp,
          },
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_banco",
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_forma_pago",
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_comprobante",
        },
      ],
    });
    res.status(200).json({
      msg: "success",
      gastos,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de getGastos, hable con el administrador: ${error}`,
    });
  }
};
const obtenerGastosxFechasPago = async (req = request, res = response) => {
  const { arrayDate } = req.query;
  const { id_empresa } = req.params;

  const fechaInicio = arrayDate[0];
  const fechaFin = arrayDate[1];
  try {
    const gastos = await Gastos.findAll({
      where: {
        flag: true,
        // 3. Filtro por fecha_comprobante entre inicio y fin (incluyendo todo el día)
        fecha_pago: {
          [Op.between]: [fechaInicio, fechaFin],
        },
      },
      order: [["fec_registro", "desc"]],
      attributes: [
        "id",
        "moneda",
        "monto",
        "fec_pago",
        "id_tipo_comprobante",
        "n_comprabante",
        "impuesto_igv",
        "impuesto_renta",
        "n_operacion",
        "fec_registro",
        "fec_comprobante",
        "descripcion",
        "id_prov",
        "cod_trabajo",
        "id_estado_gasto",
        "fecha_pago",
        "tcPEN",
      ],
      include: [
        {
          model: Proveedor,
          attributes: ["razon_social_prov"],
        },
        {
          model: ParametroGastos,
          attributes: ["id_empresa", "nombre_gasto", "grupo", "id_tipoGasto"],
          where: {
            id_empresa: id_empresa,
          },
          include: [
            {
              model: ParametroGrupo,
              as: "parametro_grupo",
            },
          ],
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_banco",
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_forma_pago",
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_comprobante",
        },
      ],
    });
    res.status(200).json({
      msg: "success",
      gastos,
    });
  } catch (error) {
    console.log(error);
  }
};
const obtenerGastosxFechasComprobante = async (
  req = request,
  res = response,
) => {
  const { arrayDate } = req.query;
  const { id_empresa } = req.params;

  const fechaInicio = arrayDate[0];
  const fechaFin = arrayDate[1];
  try {
    const gastos = await Gastos.findAll({
      where: {
        flag: true,
        // 3. Filtro por fecha_comprobante entre inicio y fin (incluyendo todo el día)
        fecha_comprobante: {
          [Op.between]: [fechaInicio, fechaFin],
        },
      },
      order: [["fec_registro", "desc"]],
      attributes: [
        "id",
        "moneda",
        "monto",
        "fec_pago",
        "id_tipo_comprobante",
        "n_comprabante",
        "impuesto_igv",
        "impuesto_renta",
        "n_operacion",
        "fec_registro",
        "fec_comprobante",
        "descripcion",
        "id_prov",
        "cod_trabajo",
        "id_estado_gasto",
        "fecha_pago",
      ],
      include: [
        {
          model: Proveedor,
          attributes: ["razon_social_prov"],
        },
        {
          model: ParametroGastos,
          attributes: ["id_empresa", "nombre_gasto", "grupo", "id_tipoGasto"],
          where: {
            id_empresa: id_empresa,
          },
          include: [
            {
              model: ParametroGrupo,
              as: "parametro_grupo",
            },
          ],
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_banco",
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_forma_pago",
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_comprobante",
        },
      ],
    });
    res.status(200).json({
      msg: "success",
      gastos,
    });
  } catch (error) {
    console.log(error);
  }
};
const obtenerPagosContratos = async (req = request, res = response) => {
  const { id_enterp } = req.params;
  try {
    const gastos = await Gastos.findAll({
      where: {
        flag: true,
        id_contrato_prov: {
          [Sequelize.Op.not]: 0,
        },
      },
      order: [["fec_registro", "desc"]],
      attributes: [
        "id",
        "moneda",
        "monto",
        "fec_pago",
        "monto_venta_cliente",
        "id_tipo_comprobante",
        "n_comprabante",
        "impuesto_igv",
        "impuesto_renta",
        "n_operacion",
        "fec_registro",
        "fec_comprobante",
        "descripcion",
        "id_prov",
        "cod_trabajo",
        "id_estado_gasto",
        "id_contrato_prov",
      ],
      include: [
        {
          model: Proveedor,
          attributes: ["razon_social_prov"],
        },
        {
          model: ParametroGastos,
          attributes: ["id_empresa", "nombre_gasto", "grupo", "id_tipoGasto"],
          where: {
            id_empresa: id_enterp,
          },
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_banco",
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_forma_pago",
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_comprobante",
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "estado_gasto",
        },
      ],
    });
    res.status(201).json({
      msg: "success",
      gastos,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: `Error en el servidor, en controller de getGastos, hable con el administrador: ${error}`,
    });
  }
};
module.exports = {
  postGasto,
  getGastos,
  getGastoxGrupo,
  obtenerGastosxFechasPago,
  getGasto,
  obtenerOrdenCompra,
  putGasto,
  deleteGasto,
  getProveedoresGastos_SinRep,
  obtenerPagosContratos,
  obtenerGastosxFechasComprobante,
};
