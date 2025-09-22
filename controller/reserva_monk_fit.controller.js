const { request, response } = require("express");

const obtenerReservasMonkFit = async (req = request, res = response) => {
  try {
    const {} = req.body;
  } catch (error) {
    console.log(error);
  }
};
const postReservaMonkFit = async (req = request, res = response) => {
  try {
    const { id_cli, fecha, id_pgm } = req.body;
  } catch (error) {
    console.log(error);
  }
};
const putReservaMonkFit = async (req = request, res = response) => {
  try {
    const { id_cli, fecha, id_pgm } = req.body;
  } catch (error) {
    console.log(error);
  }
};
const deleteReservaMonkFit = async (req = request, res = response) => {
  try {
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  obtenerReservasMonkFit,
  postReservaMonkFit,
  putReservaMonkFit,
  deleteReservaMonkFit,
};
