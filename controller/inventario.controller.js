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
      where: { flag: true, id_empresa: id_empresa },
      raw: true,
      nest: true,
      include: [
        {
          model: Parametros,
          as: "parametro_lugar_encuentro",
        },
        {
          model: ImagePT,
        },
      ],
    });
    const fechas = await GeneradorFechas.findAll({
      where: { entidad: "inventario" },
      attributes: [["fecha_fin", "fecha_hasta"]],
      raw: true,
      nest: true,
    });
    const kardexEntrada = await Kardex_Inventario.findAll({
      where: { flag: true, action: "entrada" },
      include: [
        {
          model: Articulos,
          as: "articulos_kardex",
          where: { id_empresa: id_empresa },
        },
      ],
      raw: true,
      nest: true,
    });
    const kardexSalida = await Kardex_Inventario.findAll({
      where: { flag: true, action: "salida" },
      include: [
        {
          model: Articulos,
          as: "articulos_kardex",
          where: { id_empresa: id_empresa },
        },
      ],
      raw: true,
      nest: true,
    });

    console.dir(
      generarInventario(inventario, kardexEntrada, kardexSalida, fechas),
      { depth: null, colors: true }
    );
    res.status(201).json({
      inventario_x_fechas: generarInventario(
        inventario,
        kardexEntrada,
        kardexSalida,
        fechas,
        []
      ),
    });
  } catch (error) {
    console.log(error);
  }
};

function generarInventario(
  inventario,
  kardexEntrada,
  kardexSalida,
  fechas,
  transferencias
) {
  const resultados = [];
  const fechaDesde = new Date("1900-01-01");

  fechas.forEach((fechaObj) => {
    // Convertir la fecha de corte y el id de empresa a los tipos adecuados
    const fechaHasta = new Date(fechaObj.fecha_hasta);

    // Inicializamos acumuladores para debug (totales de movimientos)
    let totalKardexEntrada = 0;
    let totalKardexSalida = 0;
    let totalTransferencias = 0;

    // Usamos un objeto auxiliar para agrupar registros por clave (producto-id_lugar)
    const itemsMap = {};

    // 1. Inicializar inventario: solo se incluyen registros de la empresa
    // cuya fecha_entrada sea <= fechaHasta.
    inventario.forEach((inv) => {
      const fechaEntrada = new Date(inv.fecha_entrada);
      if (fechaEntrada >= fechaDesde && fechaEntrada <= fechaHasta) {
        // Se usa la combinación de id (producto) e id_lugar como clave
        const key = `${inv.id}-${inv.id_lugar}`;
        if (!itemsMap[key]) {
          itemsMap[key] = {
            ...inv,
            id_lugar: inv.id_lugar,
            stock: inv.cantidad, // stock inicial
            stock_final: inv.cantidad, // se irá modificando según los movimientos
            costo_unitario: inv.costo_unitario,
            costo_total_soles: inv.costo_total_soles,
            costo_total_dolares: inv.costo_total_dolares,
            mano_obra_soles: inv.mano_obra_soles,
          };
        } else {
          // Si existen varios registros para el mismo producto y lugar se suman
          itemsMap[key].inicial += inv.cantidad;
          itemsMap[key].stock += inv.cantidad;
          itemsMap[key].stock_final += inv.cantidad;
          itemsMap[key].costo_total_soles += inv.costo_total_soles;
          itemsMap[key].costo_total_dolares += inv.costo_total_dolares;
          itemsMap[key].mano_obra_soles += inv.mano_obra_soles;
        }
      }
    });

    // 2. Aplicar movimientos de entradas (kardexEntrada) que tengan fecha_cambio <= fechaHasta
    kardexEntrada.forEach((entrada) => {
      const fechaCambio = new Date(entrada.fecha_cambio);
      if (fechaCambio >= fechaDesde && fechaCambio <= fechaHasta) {
        totalKardexEntrada += entrada.cantidad;
        const idItem = String(entrada.id_item);
        // Se actualizan todos los registros cuyo key comience con el id del producto
        Object.keys(itemsMap).forEach((key) => {
          if (key.startsWith(idItem + "-")) {
            itemsMap[key].stock_final += entrada.cantidad;
            // Se actualizan los costos de forma proporcional
            const additionalCost =
              entrada.cantidad * itemsMap[key].costo_unitario;
            const additionalCostDolares =
              entrada.cantidad * itemsMap[key]?.costo_unitario_dolares;
            itemsMap[key].costo_total_soles += additionalCost;
            itemsMap[key].costo_total_dolares += additionalCost / 3.5;
          }
        });
      }
    });

    // 3. Aplicar movimientos de salidas (kardexSalida)
    kardexSalida.forEach((salida) => {
      const fechaCambio = new Date(salida.fecha_cambio);
      if (fechaCambio >= fechaDesde && fechaCambio <= fechaHasta) {
        totalKardexSalida += salida.cantidad;
        const idItem = String(salida.id_item);
        Object.keys(itemsMap).forEach((key) => {
          if (key.startsWith(idItem + "-")) {
            itemsMap[key].stock_final -= salida.cantidad;
            const reductionCost =
              salida.cantidad * itemsMap[key].costo_unitario;
            itemsMap[key].costo_total_soles -= reductionCost;
            itemsMap[key].costo_total_dolares -= reductionCost / 3.5;
          }
        });
      }
    });

    // 4. Aplicar transferencias, filtrando por fechaTransferencia
    transferencias?.forEach((trans) => {
      const fechaTrans = new Date(trans.fechaTransferencia);
      if (fechaTrans >= fechaDesde && fechaTrans <= fechaHasta) {
        const idItem = String(trans.id_item);
        Object.keys(itemsMap).forEach((key) => {
          if (key.startsWith(idItem + "-")) {
            // Se descuenta del registro de origen
            itemsMap[key].stock_final -= trans.cantidad;
            const transferCost = trans.cantidad * itemsMap[key].costo_unitario;
            itemsMap[key].costo_total_soles -= transferCost;
            itemsMap[key].costo_total_dolares -= transferCost / 3.5;

            // Se agrega o actualiza el registro en la ubicación destino
            const destKey = `${idItem}-${trans.id_lugar}`;
            if (itemsMap[destKey]) {
              itemsMap[destKey].stock_final += trans.cantidad;
              itemsMap[destKey].costo_total_soles += transferCost;
              itemsMap[destKey].costo_total_dolares += transferCost / 3.5;
            } else {
              itemsMap[destKey] = {
                id: trans.id_item,
                id_lugar: trans.id_lugar,
                inicial: 0,
                stock: 0,
                stock_final: trans.cantidad,
                costo_unitario: itemsMap[key].costo_unitario,
                costo_total_soles: transferCost,
                costo_total_dolares: transferCost / 3.5,
                mano_obra_soles: 0,
              };
            }
          }
        });
      }
    });

    // Convertimos itemsMap a un array de items para este corte
    const itemsArray = Object.values(itemsMap);

    resultados.push({
      fechaHasta: fechaObj.fecha_hasta,
      // Aquí se retorna el array de items con los detalles de cada producto/ubicación
      articulos_directos: itemsArray,
      // Totales acumulados para cada tipo de movimiento (para fines de depuración)
      kardexEntrada: kardexEntrada.length,
      kardexSalida: kardexSalida.length,
      transferencias: transferencias?.length,
    });
  });

  return resultados;
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
