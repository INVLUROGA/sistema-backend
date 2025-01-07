const accounting = require("accounting");

const FormatMoney = (amount, moneda) => {
  const formattedAmount = accounting.formatMoney(amount, {
    symbol: `${moneda} `, // Símbolo de la moneda
    precision: 2, // Precisión de decimales
    thousand: ",", // Separador de miles
    decimal: ".", // Separador decimal
    format: "%s%v", // "%s" es el símbolo de la moneda y "%v" es el valor numérico
  });
  return formattedAmount;
};

module.exports = {
  FormatMoney,
};
