const {
  enviarMensajesWsp,
  enviarImagenWsp,
  enviarTextConImagenWsp,
} = require("../config/whatssap-web");
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const enviarMasivoAlwsp = async () => {
  const numerosDup = [{ numero: "933 102 718" }];

  // Normaliza y deduplica por número
  const numeros = [
    ...new Map(
      numerosDup
        .map((x) => {
          const num = x.numero;
          return num ? [num, { numero: num }] : null;
        })
        .filter(Boolean)
    ).values(),
  ];

  console.log(numeros);

  try {
    for (const persona of numeros) {
      const { nombre, numero } = persona;

      try {
        const imagenResp = await enviarTextConImagenWsp(
          numero,
          "https://archivosluroga.blob.core.windows.net/avatar-empleado/WhatsApp-Image-2025-09-29-at-9.33.30-AM-1759161447605.jpg",
          `
⏳ El año está por terminar… *¡quedan poco más de 12 semanas!*

Pregúntate: ¿Cómo quieres llegar a fin de año? 🤔
👉 Con más energía, menos medidas y orgulloso de tu progreso… o dejando pasar otra oportunidad.

🔥 Únete al *RETO DE 12 SEMANAS CHANGE* y cierra el 2025 con resultados reales.

📅 Inscríbete este 29 y 30 de Setiembre y aprovecha descuentos y semanas de regalo.
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
