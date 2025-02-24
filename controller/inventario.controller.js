const { request, response } = require("express");
const { Articulos } = require("../models/Articulo");
const uid = require("uuid");
const { ImagePT } = require("../models/Image");
const { Parametros } = require("../models/Parametros");
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
module.exports = {
  obtenerInventario,
  registrarArticulo,
  actualizarArticulo,
  eliminarArticulo,
  obtenerArticuloxID,
  obtenerParametrosLugares,
};
