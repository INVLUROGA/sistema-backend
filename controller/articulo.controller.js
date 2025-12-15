const { request, response } = require("express");
const { Articulos } = require("../models/Articulo");
const { ImagePT } = require("../models/Image");
const { Parametros, Parametros_zonas } = require("../models/Parametros");
const uid = require("uuid");
// Crear Articulo
const PostArticulo = async (req = request, res = response) => {
  try {
    const { id_empresa } = req.params;
    const uid_image = uid.v4();
    await Articulos.create({ ...req.body, id_empresa, uid_image });
    res.status(201).json({ msg: "Articulo creado correctamente", uid_image });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (PostArticulo)" });
  }
};

// Obtener todos los Articulos
const GetArticulosxEmpresa = async (req = request, res = response) => {
  try {
    const { id_empresa } = req.params;
    const articulos = await Articulos.findAll({
      where: {
        id_empresa,
        flag: true,
      },
      include: [
        {
          model: ImagePT,
          attributes: ["id", "name_image"],
          where: { flag: true },
          required: false,
        },
        // {
        //   model: Parametros,
        //   as: "parametro_marca",
        // },
        {
          model: Parametros_zonas,
          as: "parametro_lugar_encuentro",
          attributes: [
            ["nombre_zona", "label_param"],
            ["orden_zona", "orden_param"],
            ["nivel", "nivel"],
          ],
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
    res.status(200).json({ msg: "Articulos obtenidos", articulos });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (GetArticulos)" });
  }
};

// Obtener Articulo por ID
const GetArticuloxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const articulo = await Articulos.findOne({
      where: {
        id,
        flag: true,
      },
      include: [
        {
          model: ImagePT,
          attributes: ["id", "name_image"],
          where: { flag: true },
          required: false,
        },
      ],
    });
    res.status(200).json({ msg: "Articulo obtenido", articulo });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (GetArticulo)" });
  }
};

// Eliminar Articulo
const deleteArticuloxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const articulo = await Articulos.findOne({
      where: {
        id,
        flag: true,
      },
    });
    await articulo.update({ flag: false });
    res.status(200).json({ msg: "Articulo eliminado correctamente" });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (deleteArticulo)" });
  }
};

// Actualizar Articulo
const updateArticuloxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const uid_image = uid.v4();
    const articulo = await Articulos.findOne({
      where: {
        id,
        flag: true,
      },
    });
    await articulo.update(req.body);
    res
      .status(200)
      .json({ msg: "Articulo actualizado correctamente", uid_image });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (updateArticulo)" });
  }
};

module.exports = {
  PostArticulo,
  GetArticulosxEmpresa,
  GetArticuloxID,
  deleteArticuloxID,
  updateArticuloxID,
};
