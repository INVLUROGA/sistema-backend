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
          "https://archivosluroga.blob.core.windows.net/articulos-lugares/30septiembre2026.jpeg",
          `
*¡OFERTA FLASH CHANGE!*

Este es el momento de *renovar, llevarte más* y continuar con tu objetivo. 

🎁 Hasta 4 semanas adicionales en tu renovación.

🏷️ Precios especiales de renovación por tiempo limitado.

🎉 Sorteamos 4 membresías de *12 semanas*

📅 El sorteo será este lunes 5 a las 7:00 p. m.

*Válida solo por HOY.*

¡Renueva hoy y aprovecha todos estos beneficios!
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
