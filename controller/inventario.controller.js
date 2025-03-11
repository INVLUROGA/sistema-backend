const { request, response } = require("express");
const { Articulos, Kardex_Inventario } = require("../models/Articulo");
const uid = require("uuid");
const { ImagePT } = require("../models/Image");
const { Parametros } = require("../models/Parametros");
const { Sequelize } = require("sequelize");
const { GeneradorFechas } = require("../models/GeneradorFechas");
const obtenerInventario = async (req = request, res = response) => {
  const { id_enterprice } = req.params;
  try {
    const articulos = await Articulos.findAll({
      where: { flag: true, id_empresa: id_enterprice },
      order: [["id", "desc"]],
      include: [
        {
          model: ImagePT,
          attributes: ["name_image"],
        },
        {
          model: Parametros,
          as: "parametro_marca",
        },
        // {
        //   model: Parametros,
        //   as: "parametro_nivel",
        // },
        {
          model: Parametros,
          as: "parametro_lugar_encuentro",
          attributes: ["label_param", "grupo_param", "orden_param"],
          include: [
            {
              model: ImagePT,
              // where: { flag: true },
              attributes: ["name_image"],
            },
          ],
        },
      ],
    });
    res.status(200).json({
      articulos,
    });
  } catch (error) {
    console.log(error);

    res.status(501).json({
      msg: "Error en obtenerinventario",
    });
  }
};
const registrarArticulo = async (req = request, res = response) => {
  const { id_enterprice } = req.params;
  const uid_image = uid.v4();
  try {
    const articulo = new Articulos({
      ...req.body,
      uid_image: uid_image,
      id_empresa: id_enterprice,
    });
    await articulo.save();
    res.status(201).json({
      msg: "Articulo registrado correctamente",
      articulo,
      uid_image: articulo.uid_image,
    });
  } catch (error) {
    console.log(error);

    res.status(501).json({
      msg: "Error en registrarArticulo",
    });
  }
};
const actualizarArticulo = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const articulo = await Articulos.findByPk(id);
    if (!articulo) {
      return res.status(404).json({
        msg: "El articulo no existe",
      });
    }
    articulo.update(req.body);
    res.status(200).json({
      msg: "Articulo actualizado correctament",
      articulo,
      uid_image: articulo.uid_image,
    });
  } catch (error) {
    res.status(501).json({
      msg: "Error en actualizarArticulo",
    });
  }
};
const eliminarArticulo = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const articulo = await Articulos.findByPk(id);
    if (!articulo) {
      return res.status(404).json({
        msg: "El articulo no existe",
      });
    }
    articulo.update({ flag: false });
    await articulo.save();
    res.status(200).json({
      msg: "Articulo eliminado correctamente",
      articulo,
    });
  } catch (error) {
    res.status(501).json({
      msg: "Error en eliminarArticulo",
    });
  }
};
const obtenerArticuloxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const articulo = await Articulos.findByPk(id, { where: { flag: true } });
    if (!articulo) {
      return res.status(404).json({
        msg: "El articulo no existe",
      });
    }
    res.status(200).json({
      articulo,
    });
  } catch (error) {
    res.status(501).json({
      msg: "Error en obtenerArticuloxID",
    });
  }
};
const obtenerParametrosLugares = async (req = request, res = response) => {
  try {
    const parametros = await Parametros.findAll({
      order: [["id_param", "DESC"]],
      where: {
        entidad_param: "articulo",
        grupo_param: "lugar_encuentro",
        flag: true,
      },
      include: [
        {
          model: ImagePT,
        },
      ],
    });
    res.status(200).json(parametros);
  } catch (error) {
    console.log(error, "err en sys");

    res.status(404).json(error);
  }
};
const obtenerInventarioxFechas = async (req = request, res = response) => {
  const { id_enterprice } = req.params;
  const { fecha } = req.query;
  try {
    const articulos = await Articulos.findAll({
      where: { flag: true, id_empresa: id_enterprice },
      order: [["id", "desc"]],
      include: [
        {
          model: ImagePT,
          attributes: ["name_image"],
        },
        {
          model: Parametros,
          as: "parametro_marca",
        },
        // {
        //   model: Parametros,
        //   as: "parametro_nivel",
        // },
        {
          model: Parametros,
          as: "parametro_lugar_encuentro",
          attributes: ["label_param", "grupo_param", "orden_param"],
          include: [
            {
              model: ImagePT,
              // where: { flag: true },
              attributes: ["name_image"],
            },
          ],
        },
      ],
    });
    res.status(200).json({
      articulos,
    });
  } catch (error) {
    console.log(error);

    res.status(501).json({
      msg: "Error en obtenerinventario",
    });
  }
};
const postKardexEntraSale = async (req = request, res = response) => {
  try {
    const { action } = req.params;
    const { id_item, cantidad, fecha_cambio, id_motivo, observacion } =
      req.body;
    const entraSale = new Kardex_Inventario({
      id_item,
      cantidad,
      fecha_cambio,
      id_motivo,
      observacion,
      action,
    });
    await entraSale.save();
    res.status(201).json({
      msg: "entraSale registrado correctamente",
      entraSale,
    });
  } catch (error) {
    console.log(error);
  }
};
const eliminarEntraSale = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const entraSale = await Kardex_Inventario.findByPk(id);
    if (!entraSale) {
      return res.status(404).json({
        msg: "La entra/sale no existe",
      });
    }
    entraSale.update({ flag: false });
    res.status(200).json({
      msg: "Entrada/salida eliminada correctamente",
      entraSale,
    });
  } catch (error) {
    console.log(error);
  }
};
const obtenerKardex = async (req = request, res = response) => {
  try {
    const { id_enterprice, action } = req.params;
    const kardex = await Kardex_Inventario.findAll({
      where: { flag: true, action },
      order: [["id", "desc"]],
      include: [
        {
          model: Articulos,
          where: { id_empresa: id_enterprice },
          as: "articulos_kardex",
        },
        {
          model: Parametros,
          as: "parametro_motivo",
        },
      ],
    });
    res.status(201).json({
      kardex,
    });
  } catch (error) {
    console.log(error);
  }
};
const postFechaReportKardex = async (req = request, res = response) => {
  try {
    const { fecha_hasta } = req.body;
    // const fechaInventariado =
  } catch (error) {
    console.log(error);
  }
};
const removeFechaReportKardex = async (req = request, res = response) => {};
const obtenerFechaReportKardex = async (req = request, res = response) => {};

const getInventarioxKardexxFechasxEmpresa = async (
  req = request,
  res = response
) => {
  try {
    const { id_empresa } = req.params;
    const inventario = await Articulos.findAll({
      where: { flag: true, id_empresa: id_empresa, id: 254 },
      raw: true,
      nest: true,
      include: [
        {
          model: Parametros,
          as: "parametro_lugar_encuentro",
        },
      ],
    });
    const fechas = await GeneradorFechas.findAll({
      where: { entidad: "inventario" },
      raw: true,
      nest: true,
    });
    const kardexEntrada = await Kardex_Inventario.findAll({
      where: { flag: true, action: "entrada" },
      raw: true,
      nest: true,
    });
    const kardexSalida = await Kardex_Inventario.findAll({
      where: { flag: true, action: "salida" },
      raw: true,
      nest: true,
    });

    console.log(
      { inventario, kardexEntrada, kardexSalida, fechas },
      generarInventario(inventario, kardexEntrada, kardexSalida, fechas)
    );
    console.dir(
      generarInventario(inventario, kardexEntrada, kardexSalida, fechas),
      { depth: null, colors: true }
    );
    res.status(201).json({
      inventario_x_fechas: generarInventario(
        inventario,
        kardexEntrada,
        kardexSalida,
        fechas
      ),
    });
  } catch (error) {
    console.log(error);
  }
};

function generarInventario(
  tb_articulo,
  articulos_entrada,
  articulos_salida,
  fechas
) {
  return fechas.map(({ fecha_fin: fecha_hasta }) => {
    let inventario = new Map();

    // Paso 1: Iniciar todos los artículos en el inventario
    tb_articulo.forEach(({ id, fecha_entrada, producto, cantidad, ...e }) => {
      if (fecha_entrada <= fecha_hasta) {
        inventario.set(id, {
          id,
          producto,
          stock_final: cantidad,
          stock_inicial: cantidad, // Guardamos stock inicial
          ...e,
        });
      }
    });

    // Paso 2: Restar salidas primero, hasta agotar stock inicial
    articulos_salida.forEach(({ id_articulo, cantidad, fecha_cambio }) => {
      if (fecha_cambio <= fecha_hasta && inventario.has(id_articulo)) {
        let articulo = inventario.get(id_articulo);

        if (articulo.stock_final > 0) {
          articulo.stock_final = Math.max(articulo.stock_final - cantidad, 0);
        }
      }
    });

    // Paso 3: Sumar entradas con fecha_cambio ≤ fecha_hasta
    articulos_entrada.forEach(({ id_articulo, cantidad, fecha_cambio }) => {
      if (fecha_cambio <= fecha_hasta && inventario.has(id_articulo)) {
        let articulo = inventario.get(id_articulo);

        // Si el stock inicial ya se agotó y hay una nueva entrada, lo aumentamos
        if (
          articulo.stock_final === 0 ||
          articulo.stock_final < articulo.stock_inicial
        ) {
          articulo.stock_final += cantidad;
        }
      }
    });

    // Paso 4: Generar el array de artículos
    let articulos_directos = Array.from(inventario.values());

    return { fecha_hasta, articulos_directos };
  });
}
module.exports = {
  obtenerInventario,
  registrarArticulo,
  actualizarArticulo,
  eliminarArticulo,
  obtenerArticuloxID,
  obtenerParametrosLugares,
  obtenerInventarioxFechas,
  postKardexEntraSale,
  eliminarEntraSale,
  obtenerKardex,
  postFechaReportKardex,
  removeFechaReportKardex,
  obtenerFechaReportKardex,
  getInventarioxKardexxFechasxEmpresa,
};
