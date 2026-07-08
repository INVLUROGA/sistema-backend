const {
  enviarMensajesWsp,
  enviarImagenWsp,
  enviarTextConImagenWsp,
} = require("../config/whatssap-web");
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const enviarMasivoAlwsp = async () => {
  const numerosDup = [{ numero: "933102718" }, { numero: "914028922" }];

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
          "https://archivosluroga.blob.core.windows.net/avatar-articulos/julio2026.jpeg",
          `
🇵🇪 ¡Promoción exclusiva para socios y reinscripciones! 

*DEL 08 AL 17 DE JULIO*
Aprovecha nuestra campaña por Fiestas Patrias y entrena todo julio GRATIS al renovar o reinscribirte en un plan de 12 semanas o más.

 *¡EL MES DE JULIO VA POR NUESTRA CUENTA!* 🇵🇪

*Pregunta por nuestras promociones*
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
