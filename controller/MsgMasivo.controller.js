const {
  enviarMensajesWsp,
  enviarImagenWsp,
  enviarTextConImagenWsp,
} = require("../config/whatssap-web");
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const enviarMasivoAlwsp = async () => {
  const numerosDup = [{ numero: "933102718" }];

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
        const imagenResp = await enviarMensajesWsp(
          numero,
          `
*¡Change Community ven a entrenar y cantar! 💪🎤🎶*

Ven y diviértete! Disfruta de nuestro *FULL KARAOKE CHANGE* este SABADO 04 DE OCTUBRE:

✅ ENTRENAMIENTO INTENSO: 7:00 am a 10:50 am, durante este horario entrenarás Full y si tienes una canción pilas, sube al escenario canta con nosotros y que el resto entrene!

✅ *FULL KARAOKE CHANGE*: 10:50 am a 1:00 pm Canta libremente todo lo que quieras siéntete un artista de verdad escenario, luces, sonido, humo. 

*TU ACCESO ES LIBRE* como socio y ex socio.

*DRESS CODE*: 
Ropa deportiva para entrenar 

Si tienes planes después… ¡en ropa de calle! Lo importante es que te diviertas y hagas NetWork.

¡Trae a tus amigos! Puedes venir hasta con *2 INVITADOS* para que se diviertan entrenando contigo en cualquiera de nuestros horarios y/o a nuestro *Full Karaoke Change*.

⚠️ Atención: *¡CUPOS LIMITADOS!*
Asegura tu lugar y el de tus amigos lo antes posible escribiendo a nuestros números.

¡Te esperamos para entrenar y cantar! 🎤
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
