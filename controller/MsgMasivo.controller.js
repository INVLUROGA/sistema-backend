const {
  enviarMensajesWsp,
  enviarImagenWsp,
  enviarTextConImagenWsp,
} = require("../config/whatssap-web");
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const enviarMasivoAlwsp = async () => {
  const numerosDup = [
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
          "https://archivosluroga.blob.core.windows.net/avatar-articulos/DÍAS CHANGE1.jpeg",
          `
🚨 Últimos días de nuestra promoción de 12 semanas por S/999 🚨

Hola ${nombre} 👋🏻

Si ya entrenaste con nosotros, sabes que aquí no vendemos solo acceso a un gimnasio… trabajamos resultados reales 💪

Esta promoción exclusiva de renovación y reinscripción ya está por finalizar, y es una gran oportunidad para volver a enfocarte, retomar tu proceso y seguir avanzando con el sistema CHANGE 🔥

✅ 12 semanas por solo S/999
✅ Promoción válida por tiempo limitado
✅ Exclusivo para alumnos y ex alumnos

No lo dejes para después… los resultados se mantienen cuando decides continuar 👊

Escríbenos y asegura tu renovación antes que termine la promo.
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
