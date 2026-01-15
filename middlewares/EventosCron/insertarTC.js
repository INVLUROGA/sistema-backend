const { TipoDeCambio } = require("../../models/TipoCambio");

const insertarTC = async () => {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await response.json();
    const tipoCambio = new TipoDeCambio({
      monedaDestino: "PEN",
      monedaOrigen: "USD",
      precio_compra: data.rates.PEN,
      precio_venta: data.rates.PEN,
      fecha: new Date(data.time_last_update_unix * 1000),
    });
    await tipoCambio.save();
    return true;
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  insertarTC,
};
