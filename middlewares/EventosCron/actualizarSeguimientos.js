const { Seguimiento } = require("../../models/Seguimientos");
const { obtenerDataSeguimientos } = require("./obtenerDataSeguimientos");

const actualizarSeguimientos = async () => {
  try {
    console.log("data procesada");
    await Seguimiento.destroy({ where: {} });
    console.log("data Seguimiento eliminado");
    await obtenerDataSeguimientos();
    console.log("data Seguimiento extraido");
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  actualizarSeguimientos,
};
