const { request, response } = require("express");
const { Canjes } = require("../models/modelsCircus/Canjes");

const postCanje = async (req = request, res = response) => {
  const { id_empresa } = req.params;
  try {
    const canje = new Canjes({ ...req.body });
    await canje.save();
    res.status(201).json({
      canje,
    });
  } catch (error) {
    console.log(error);
  }
};
const updateCanje = async (req = request, res = response) => {};
const deleteCanje = async (req = request, res = response) => {};
const obtenerCanjes = async (req = request, res = response) => {
  try {
    const canjes = await Canjes.findAll({ flag: true });
    res.status(201).json({
      canjes,
    });
  } catch (error) {
    console.log(error);
  }
};
const obtenerCanje = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const canje = await Canjes.findOne({ where: { flag: true, id: id } });
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  postCanje,
  updateCanje,
  deleteCanje,
  obtenerCanjes,
  obtenerCanje,
};
