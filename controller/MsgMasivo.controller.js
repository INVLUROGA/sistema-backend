const {
  enviarMensajesWsp,
  enviarImagenWsp,
  enviarTextConImagenWsp,
} = require("../config/whatssap-web");
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const enviarMasivoAlwsp = async () => {
  const numerosDup = [];
  const numeros = [...new Set(numerosDup)];

  try {
    for (const persona of numeros) {
      const { nombre, numero } = persona;
      try {
        const imagenResp = await enviarTextConImagenWsp(
          numero,
          `https://archivosluroga.blob.core.windows.net/avatar-articulos/2d688e4d-2a15-455e-826a-ad2b0bbec7a9-1752163539752.jpg`,
          `
🔥 ¡LLEGÓ EL CYBER CHANGE! 🔥

La oportunidad que esperabas para transformar tu cuerpo con beneficios exclusivos.
Inscríbete en un plan de 12 semanas a más y te llevas 28 días de regalo. 💥

🏋️‍♀️ Programas de entrenamiento grupales y dirigidos
📉 Plan de alimentación personalizado por nutricionistas profesionales
✅ Seguimiento de resultados
📝 Evaluación de composición corporal 

⏳ Cupos limitados. 

Tu cambio empieza HOY.
📲 Escríbenos ya y asegura tu lugar.
#CyberChange #TransformaTuCuerpo
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
