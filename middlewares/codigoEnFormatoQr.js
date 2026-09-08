const QRCode = require("qrcode");
const { enviarImagenWsp } = require("../config/whatssap-web");

const codigoEnFormatoQr = async (codigoStr, numeroWsp) => {
  try {
    const base64 = await QRCode.toDataURL(codigoStr, {
      errorCorrectionLevel: "M",
      width: 300,
      margin: 2,
    });
    return base64;
    
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  codigoEnFormatoQr,
};
