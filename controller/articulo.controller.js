const { request, response } = require("express");
const { Articulos } = require("../models/Articulo");

// Crear Articulo
const PostArticulo = async (req = request, res = response) => {
  try {
    await Articulos.create(req.body);
    res.status(201).json({ msg: "Articulo creado correctamente" });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (PostArticulo)" });
  }
};

// Obtener todos los Articulos
const GetArticulos = async (req = request, res = response) => {
  try {
    const { id_empresa } = req.params;
    const articulos = await Articulos.findAll({
      where: {
        id_empresa,
        flag: true,
      },
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
    const articulo = await Articulos.findOne({
      where: {
        id,
        flag: true,
      },
    });
    await articulo.update(req.body);
    res.status(200).json({ msg: "Articulo actualizado correctamente" });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (updateArticulo)" });
  }
};

module.exports = {
  PostArticulo,
  GetArticulos,
  GetArticuloxID,
  deleteArticuloxID,
  updateArticuloxID,
};
