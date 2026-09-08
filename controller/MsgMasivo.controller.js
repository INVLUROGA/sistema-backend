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
        const imagenResp = await enviarTextConImagenWsp(
          numero,
          "https://archivosluroga.blob.core.windows.net/articulos-lugares/27-agosto-2026.jpeg",
          `
Tenemos 2 REGALOS PARA TI 🎁

Continua con tu proceso en Change, este es un buen momento para hacerlo y prepararse para el Verano 2027.

IMPORTANTE: SÓLO 8 CUPOS DISNPONIBLES y hasta el 31 de agosto,  para acceder a este beneficio.

Si quieres tomar uno, responde *“QUIERO MI REGALO”* y te ayudamos a activarlo. 🙌🏽
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
