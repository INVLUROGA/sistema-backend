const { request, response } = require("express");
const { AlertasUsuario } = require("../models/Auditoria");

// Crear AlertaUsuario
const PostAlertaUsuario = async (req = request, res = response) => {
  try {
    const alertaUsuario = new AlertasUsuario(req.body);
    await alertaUsuario.save();
    res.status(201).json({ msg: "AlertaUsuario creado correctamente" });
  } catch (error) {
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (PostAlertaUsuario)",
    });
  }
};

// Obtener todos los AlertaUsuarios
const GetAlertaUsuarios = async (req = request, res = response) => {
  try {
    const alertas = await AlertasUsuario.findAll({ where: { flag: true } });
    res.status(200).json({ msg: "AlertaUsuarios obtenidos", alertas });
  } catch (error) {
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (GetAlertaUsuarios)",
    });
  }
};

// Obtener AlertaUsuario por ID
const GetAlertaUsuario = async (req = request, res = response) => {
  try {
    res.status(200).json({ msg: "AlertaUsuario obtenido" });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (GetAlertaUsuario)" });
  }
};

// Eliminar AlertaUsuario
const deleteAlertaUsuario = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const alertaUsuario = await AlertasUsuario.findOne({ where: { id } });
    alertaUsuario.update({ flag: false });
    res.status(200).json({ msg: "AlertaUsuario eliminado correctamente" });
  } catch (error) {
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (deleteAlertaUsuario)",
    });
  }
};

// Actualizar AlertaUsuario
const updateAlertaUsuario = async (req = request, res = response) => {
  try {
    res.status(200).json({ msg: "AlertaUsuario actualizado correctamente" });
  } catch (error) {
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (updateAlertaUsuario)",
    });
  }
};

module.exports = {
  PostAlertaUsuario,
  GetAlertaUsuarios,
  GetAlertaUsuario,
  deleteAlertaUsuario,
  updateAlertaUsuario,
};
