const { request, response } = require('express');

// Crear Feriado
const PostFeriado = async (req = request, res = response) => {
  try {
    res.status(201).json({ msg: 'Feriado creado correctamente' });
  } catch (error) {
    res.status(500).json({ msg: 'ERROR EN LA BASE DE DATOS O SERVIDOR (PostFeriado)' });
  }
};

// Obtener todos los Feriados
const GetFeriados = async (req = request, res = response) => {
  try {
    res.status(200).json({ msg: 'Feriados obtenidos' });
  } catch (error) {
    res.status(500).json({ msg: 'ERROR EN LA BASE DE DATOS O SERVIDOR (GetFeriados)' });
  }
};

// Obtener Feriado por ID
const GetFeriado = async (req = request, res = response) => {
  try {
    res.status(200).json({ msg: 'Feriado obtenido' });
  } catch (error) {
    res.status(500).json({ msg: 'ERROR EN LA BASE DE DATOS O SERVIDOR (GetFeriado)' });
  }
};

// Eliminar Feriado
const deleteFeriado = async (req = request, res = response) => {
  try {
    res.status(200).json({ msg: 'Feriado eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ msg: 'ERROR EN LA BASE DE DATOS O SERVIDOR (deleteFeriado)' });
  }
};

// Actualizar Feriado
const updateFeriado = async (req = request, res = response) => {
  try {
    res.status(200).json({ msg: 'Feriado actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ msg: 'ERROR EN LA BASE DE DATOS O SERVIDOR (updateFeriado)' });
  }
};

module.exports = {
  PostFeriado,
  GetFeriados,
  GetFeriado,
  deleteFeriado,
  updateFeriado,
};