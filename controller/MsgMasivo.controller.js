const {
  enviarMensajesWsp,
  enviarImagenWsp,
  enviarTextConImagenWsp,
} = require("../config/whatssap-web");
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const enviarMasivoAlwsp = async () => {
  const numerosDup = [
    { numero: "914 028 922", nombre: "ALVARO INICIO" },
    { numero: "933 102 718", nombre: "CARLOS INICIO" },
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

      try {
        const imagenResp = await enviarTextConImagenWsp(
          numero,
          "https://archivosluroga.blob.core.windows.net/avatar-empleado/WhatsApp Image 2026-04-22 at 9.15.35 AM-1776869005477.jpeg",
          `
SEMANAS DEL SOCIO CHANGE*

Hola ${nombre}, te tenemos una invitación especial 👀

*Del 22 al 28 de abril podrás volver a entrenar GRATIS como socio CHANGE.*

Además, según disponibilidad, tendrás una evaluación express de tu composición corporal para que sepas exactamente dónde estás y cómo avanzar.

Queremos que retomes tu proceso con enfoque y sin perder tiempo.

*Son cupos limitados. ¿Te separo un horario?*`,
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
