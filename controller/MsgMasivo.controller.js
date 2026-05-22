const {
  enviarMensajesWsp,
  enviarImagenWsp,
  enviarTextConImagenWsp,
} = require("../config/whatssap-web");
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const enviarMasivoAlwsp = async () => {
  const numerosDup = [
    { numero: "914 028 922", nombre: "ALVARO" },
    { numero: "933 102 718", nombre: "CARLOS" },
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
          "https://archivosluroga.blob.core.windows.net/avatar-empleado/D%C3%8DAS%20CHANGE.jpg.jpeg",
          `
Hola ${nombre} 👋🏻

Queremos que no pierdas el avance que ya lograste en CHANGE 💪

Por eso, del 20 al 27 de mayo, hemos activado una campaña exclusiva de renovación y reinscripción para miembros y ex miembros de nuestra comunidad 🔥

12 semanas por S/.999

Sabemos que retomar a tiempo hace toda la diferencia, y queremos ayudarte a seguir avanzando con la estructura, acompañamiento y seguimiento que ya conoces 🙌

Si deseas aprovechar esta campaña especial, escríbeme y te ayudo personalmente.`,
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
