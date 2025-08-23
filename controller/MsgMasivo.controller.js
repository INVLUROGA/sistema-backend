const {
  enviarMensajesWsp,
  enviarImagenWsp,
  enviarTextConImagenWsp,
} = require("../config/whatssap-web");
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const enviarMasivoAlwsp = async () => {
  const numerosDup = [
    { numero: "933102718" },
  ];

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
              "https://archivosluroga.blob.core.windows.net/avatar-empleado/WhatsApp-Image-2025-08-22-at-9.22.55-AM-1755874414347.jpg",
              `
    💡 Andrea confió en nosotros y empezó su cambio:

     En *menos de 8 semanas, BAJO  11 KG DE GRASA* con Change45.

     En *10 semanas, ya lleva BAJANDO 15.8 KG DE GRASA Y AUMENTO 1.8 KG DE MASA MUSCULAR.*

    💪 Tú también puedes lograrlo, *empezando con nosotros hoy.*

    👉 Los cupos son limitados, este puede ser tu día 1.

    *CALLE TARATA  N.º 226, MIRAFLORES*

    *Mira el video de Andrea, aquí...*

    *facebook:*  https://www.facebook.com/share/r/1Eo36nj69r/

    *instagram:* https://www.instagram.com/reel/DNiQHNxuPDS/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==
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
