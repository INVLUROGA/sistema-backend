const {
  enviarMensajesWsp,
  enviarImagenWsp,
  enviarTextConImagenWsp,
  enviarVideoConImagenWsp,
} = require("../config/whatssap-web");
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const enviarMasivoAlwsp = async () => {
  const numerosDup = [
    
    { numero: "933102718" },
    { numero: "986578004" },
  ];

  // Normaliza y deduplica por número
  const numeros = [
    ...new Map(
      numerosDup
        .map((x) => {
          const num = x.numero;
          return num ? [num, { numero: num, nombre: x.nombre }] : null;
        })
        .filter(Boolean),
    ).values(),
  ];

  console.log(numeros);

  try {
    for (const persona of numeros) {
      const { nombre, numero } = persona;
      console.log({ persona, numero });

      try {
        const imagenResp = await enviarTextConImagenWsp(
          numero,
          "https://archivosluroga.blob.core.windows.net/actas/black_friday_image.jpeg",
          `
*¡HOY ES EL ÚLTIMO DÍA DE BLACK WEEK EN CHANGE!*

Si estabas pensando en renovar, continuar entrenando o retomar tu entrenamiento, ¡esta es tu oportunidad!

💪 Aprovecha  y consigue *más semanas de entrenamiento con una menor inversión.*

Estamos llegando a los últimos cupos disponibles y esta promoción termina HOY.

No dejes para después una decisión que puede ayudarte a seguir avanzando en tus *resultados.*

📲 Escríbenos ahora y asegura tu renovación o tu cupo con Black Week.
`,
        );
        if (!imagenResp.ok) {
          console.error(`❌ Falló imagen a ${numero}`);
          continue;
        }
        console.log(`Mensaje e imagen enviados a ${numero}`);
      } catch (error) {
        console.error(
          `Error al enviar a ${numero}:`,
          error.response?.data || error.message,
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
