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
    for (const numero of numeros) {
      try {
        await delay(1000); // Delay entre mensaje e imagen http://localhost:4000/api/msg-masivos/masivo/wsp

        const imagenResp = await enviarTextConImagenWsp(
          numero,
          `https://archivosluroga.blob.core.windows.net/avatar-articulos/WhatsApp Image 2025-05-12 at 8.05.37 AM-1747055229565-1747055803245.png`,
          `
🔥 *¡ATENCIÓN! MES DE MAMÁ = MES DE GUERRERAS* 🔥

Este MAYO no hay excusas.

💪 *ENTRENA TODO EL MES GRATIS*💪
Sí, leíste bien: *¡TODO MAYO GRATIS!*

Al adquirir cualquier *plan de 12 semanas o más*, tu entrenamiento de *TODO MAYO VA POR LA CASA.*

No es un regalo.
Es una INVERSIÓN en ti.
Es tiempo de ponerte PRIMERO.
Es tiempo de verte, sentirte y romperla mejor que nunca.

🎯 Cupos LIMITADOS
📆 Promo válida solo en MAYO
🚀 ¡Empieza AHORA o sigue viendo cómo otros cambian mientras tu esperas!

*¡ES AHORA O NUNCA!*
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
      await delay(1000); // Delay entre cada número
    }

    console.log("Envío masivo completado.");
  } catch (error) {
    console.log("Error general:", error);
  }
};
module.exports = {
  enviarMasivoAlwsp,
};
