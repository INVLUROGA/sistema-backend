const {
  enviarMensajesWsp,
  enviarImagenWsp,
  enviarTextConImagenWsp,
} = require("../config/whatssap-web");
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const enviarMasivoAlwsp = async () => {
  const numerosDup = [
    { numero: "933102718" },
    { numero: "986 578 004" },
    { numero: "914028922" },
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
        const imagenResp = await enviarMensajesWsp(
          numero,
          `
GANA SEMANAS DE ENTRENAMIENTO 🎁🔥

Queremos seguir mejorando Change45 y necesitamos conocer tu opinión.

Responde esta breve encuesta de solo 2 preguntas y, si respondes dentro de las próximas 24 horas, participarás en un sorteo para ganar semanas adicionales en tu plan. 

📢 Publicaremos a los ganadores este viernes a las 5:00 p. m.

Tu respuesta nos ayudará a construir un Change45 cada vez más efectivo para ti.

¡Gracias por ayudarnos a SEGUIR mejorando! 💪

https://forms.gle/w4fmBzYT7ueqazFM8
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
