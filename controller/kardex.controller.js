const { request, response } = require("express");

const obtenerKardexEntrada = (req = request, res = response) => {
  try {
    const { id_empresa } = req.params;
  } catch (error) {
    console.log(error);
  }
};
const obtenerKardexSalidas = () => {
  try {
  } catch (error) {
    console.log(error);
  }
};
const obtenerItemKardex = ({ req, res }) => {};
const postKardexxAccion = (req, res) => {};
const obtenerMovimientosxArticulo = (req, res)=>{
  try {
    
  } catch (error) {
    
  }
}
module.exports = {
  obtenerKardexSalidas,
  obtenerKardexEntrada,
  obtenerItemKardex,
  postKardexxAccion,
  obtenerMovimientosxArticulo
};
