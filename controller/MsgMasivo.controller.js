const {
  enviarMensajesWsp,
  enviarImagenWsp,
  enviarTextConImagenWsp,
} = require("../config/whatssap-web");
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const enviarMasivoAlwsp = async () => {
  const numerosDup = [];
  const numeros = [...new Set(numerosDup)];

  try {
    for (const persona of numeros) {
      const { nombre, numero } = persona;
      try {
        const imagenResp = await enviarTextConImagenWsp(
          numero,
          `https://archivosluroga.blob.core.windows.net/avatar-articulos/WhatsApp-Image-2025-06-23-at-2.58.12-PM-1750710383932.jpg`,
          `
          `
        );

        if (!imagenResp.ok) {
          console.error(`❌ Falló imagen a ${numero}`);
          continue;
        }
        console.log(`Mensaje e imagen enviados a ${numero}`);
      } catch (error) {
        console.error(
          `Error al enviar a ${numero}:`,
          error.response?.data || error.message
        );
      }
    }

    console.log("Envío masivo completado.");
  } catch (error) {
    console.log("Error general:", error);
  }
};
module.exports = {
  enviarMasivoAlwsp,
};
