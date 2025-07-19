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
          `https://archivosluroga.blob.core.windows.net/avatar-articulos/WhatsApp Image 2025-07-16 at 11.02.36 AM-1752681809362.jpeg`,
          `
🔴 ¿TE QUEDASTE SIN GIMNASIO? 🏋🏼

El progreso no se detiene solo porque tu gym sí lo hizo.

🎯 Este mes patrio, tú eliges:

1️⃣ Ponerle pausa a tus metas.
2️⃣ Entrenar 28 días totalmente gratis por 28 de Julio y descubrir lo que puedes lograr en un centro boutique como Change.

✨ ¿Qué hace diferente a Change?

✔️ Grupos reducidos
✔️ Entrenamiento grupal dirigido
✔️ Evaluación corporal con tecnología
✔️ Plan nutricional
✔️ Resultados visibles desde la primera semana

En Change no vienes a probar suerte.
💪 Vienes a transformar tu cuerpo, tu mente y tu vida.

📲 Escríbenos y separa tu cupo.

#28Por28 #ChangeEsCambio #MesDelCambio
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
