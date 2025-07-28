const {
  enviarMensajesWsp,
  enviarImagenWsp,
  enviarTextConImagenWsp,
} = require("../config/whatssap-web");
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const enviarMasivoAlwsp = async () => {
  const numerosDup = [
  ];
  const numeros = [...new Set(numerosDup)];

  try {
    for (const persona of numeros) {
      const { nombre, numero } = persona;
      try {
        await enviarImagenWsp(
          numero,
          `https://archivosluroga.blob.core.windows.net/avatar-articulos/1fp-1753467374791.webp`
        );
        await enviarImagenWsp(
          numero,
          `https://archivosluroga.blob.core.windows.net/avatar-articulos/2fp-1753467453324.webp`
        );
        const imagenResp = await enviarTextConImagenWsp(
          numero,
          `https://archivosluroga.blob.core.windows.net/avatar-articulos/3.fp-1753467483926.webp`,
          `
Fiestas Patrias con propósito 

Este 28 de julio, da el paso hacia tu mejor versión.
Activa tu plan de 3 meses a más y accede a:

✅ Entrenamiento grupal 100% dirigido
✅ Incluye cita con nutricionistas profesionales
✅ Coaches con más de 20 años de experiencia
✅ Salas exclusivas y aforo limitado
✅ Sistema inteligente de ultima tecnología para REDUCCION DE PESO Y MEDIDAS
✅ Resultados desde las primeras semanas

📅 Válido del viernes 25 al jueves 31 de julio.

🔥 ¡Tu cambio empieza hoy, no lo postergues más!
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
