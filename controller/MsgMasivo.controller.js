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
        const imagenResp = await enviarVideoConImagenWsp(
          numero,
          "",
          `
*CHANGE | Mañana se cierra el BLACK WEEK*⏳

Nadie planea dejar de entrenar. *PASA*: una semana complicada, luego otra… y cuando te das cuenta, toca empezar de nuevo.

🏖️ ¨*Y el VERANO llega igual.*

Hoy todavía puedes asegurar *más semanas con menor inversión, y darte el tiempo para ver resultados.*

El domingo vas a querer lo mismo, *pero ya sin este beneficio.*

🔴 Solo hasta mañana, sábado 28. No se extiende. Hasta agotar 15 cupos. 

Responde CHANGE ahora, antes de dejarlo para después.
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
