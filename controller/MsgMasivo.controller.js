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
          `https://archivosluroga.blob.core.windows.net/avatar-articulos/promocionn 999_Mesa de trabajo 1-1754687223485.png`,
          `
🔥 Baja hasta 8 kilos por mes y recupera tu salud en 12 semanas 🔥

NO ES MAGIA, ES ENTRENAMIENTO Y NUTRICIÒN PERSONALIZADA.

✅ Pierde grasa sin poner en riesgo tu salud
✅ Siente más energía desde la primera semana
✅ Resultados reales y medibles

💰 Solo S/999 — Cupos limitados

📲 Responde este mensaje y asegura tu lugar antes que se agoten.
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
