const {
  enviarMensajesWsp,
  enviarImagenWsp,
  enviarTextConImagenWsp,
} = require("../config/whatssap-web");
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const enviarMasivoAlwsp = async () => {
  const numerosDup = [{ numero: "933102718" }, { numero: "949203242" }];

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
          "https://archivosluroga.blob.core.windows.net/avatar-empleado/WhatsApp-Image-2025-08-27-at-9.52.49-AM-1756309545028.jpg",
          `
🔥 El verano se acerca y es momento de decidir cómo quieres verte.

En *CHANGE* te damos planes efectivos para transformar tu cuerpo de manera acelerada cuidando sobretodo tu salud. 

👉 Y si te inscribes antes del domingo, *TE REGALAMOS HASTA 08 SEMANAS GRATIS* 🎁 según el plan que elijas.

Solo 10 cupos disponibles ⏳.

*¿Te reservo el tuyo ahora mismo?*
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
