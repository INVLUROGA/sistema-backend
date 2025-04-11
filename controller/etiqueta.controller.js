const { request, response } = require("express");
const { EtiquetasxIds, Parametros } = require("../models/Parametros");

const postEtiqueta = async (req = request, res = response) => {
  try {
    const { entidad, grupo, id_fila } = req.params;
    const { etiquetas } = req.body;
    const etiquetasBusqueda = etiquetas.map((g) => {
      return {
        entidad_param: entidad,
        grupo_param: grupo,
        id_fila,
        id_parametroEtiqueta: g.value,
      };
    });
    await EtiquetasxIds.bulkCreate(etiquetasBusqueda);
    res.status(201).json({
      msg: "listo",
    });
  } catch (error) {
    console.log(error);
  }
};
const getEtiquetasxEntidadGrupo = async (req, res) => {
  try {
    const { entidad, grupo } = req.params;
    const data = await EtiquetasxIds.findAll({
      where: {
        entidad_param: entidad,
        grupo_param: grupo,
        flag: true,
      },
      include: [
        {
          model: Parametros,
          as: "parametro_etiqueta",
        },
      ],
    });
    res.status(201).json({
      etiquetasxID: data,
    });
  } catch (error) {
    console.log(error);
  }
};
const getEtiquetasxIdEntidadGrupo = async (req, res) => {
  try {
    const { id_fila, entidad, grupo } = req.params;
    const data = await EtiquetasxIds.findAll({
      where: {
        entidad_param: entidad,
        grupo_param: grupo,
        id_fila,
        flag: true,
      },
      include: [
        {
          model: Parametros,
          as: "parametro_etiqueta",
        },
      ],
    });
    res.status(201).json({
      etiquetasxID: data,
    });
  } catch (error) {
    console.log(error);
  }
};
const putEtiquetasxIdEntidadGrupo = async (req, res) => {
  try {
    const { id_fila, entidad, grupo } = req.params;
    const { etiquetas } = req.body;
    await EtiquetasxIds.update(
      { flag: false },
      {
        where: {
          entidad_param: entidad,
          grupo_param: grupo,
          id_fila,
          flag: true,
        },
      }
    );
    console.log(etiquetas, "antes del bulk");

    const etiquetasBusqueda = etiquetas.map((g) => {
      return {
        entidad_param: entidad,
        grupo_param: grupo,
        id_fila,
        id_parametroEtiqueta: g.value,
      };
    });
    await EtiquetasxIds.bulkCreate(etiquetasBusqueda);
    console.log(etiquetas, "despues del bulk");
    res.status(201).json({
      etiquetasxID: etiquetasBusqueda,
    });
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  postEtiqueta,
  getEtiquetasxIdEntidadGrupo,
  putEtiquetasxIdEntidadGrupo,
  getEtiquetasxEntidadGrupo,
};
