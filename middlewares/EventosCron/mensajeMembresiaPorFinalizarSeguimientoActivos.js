const { Op } = require("sequelize");
const { Seguimiento } = require("../../models/Seguimientos");
const { enviarMensajesWsp } = require("../../config/whatssap-web");

// El server corre en UTC y Perú es UTC-5 todo el año (sin horario de verano).
// Se busca a los clientes cuya fecha_vencimiento cae EXACTAMENTE en el día
// (calendario de Perú, lunes a domingo) que resulta de sumar numero/tiempo a
// hoy: "1 semana" = los que vencen dentro de 7 días naturales, no todos los que
// vencen entre hoy y 7 días.
const OFFSET_PERU_MS = 5 * 60 * 60 * 1000;
const obtenerFechaPeru = (fecha = new Date()) =>
  new Date(new Date(fecha).getTime() - OFFSET_PERU_MS);

const CALCULADORES_DE_TIEMPO = {
  dia: (fecha, numero) => fecha.setUTCDate(fecha.getUTCDate() + numero),
  semana: (fecha, numero) => fecha.setUTCDate(fecha.getUTCDate() + numero * 7),
  mes: (fecha, numero) => fecha.setUTCMonth(fecha.getUTCMonth() + numero),
  año: (fecha, numero) => fecha.setUTCFullYear(fecha.getUTCFullYear() + numero),
};

// Devuelve [inicio, fin) del día de Perú hoy + numero/tiempo, como instantes UTC.
const calcularRangoDiaObjetivo = (numero, tiempo) => {
  const calcularIncremento = CALCULADORES_DE_TIEMPO[tiempo];

  if (!calcularIncremento) {
    throw new Error(
      `Tiempo "${tiempo}" inválido. Usa: ${Object.keys(CALCULADORES_DE_TIEMPO).join(", ")}`,
    );
  }

  const diaObjetivo = obtenerFechaPeru();
  diaObjetivo.setUTCHours(0, 0, 0, 0);
  calcularIncremento(diaObjetivo, numero);

  const inicio = new Date(diaObjetivo.getTime() + OFFSET_PERU_MS);
  const fin = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  return { inicio, fin };
};

const mensajeMembresiaPorFinalizarSeguimientoActivos = async (
  numero,
  tiempo,
  mensaje,
) => {
  try {
    const { inicio, fin } = calcularRangoDiaObjetivo(numero, tiempo);

    const seguimientos = await Seguimiento.findAll({
      where: {
        flag: true,
        fecha_vencimiento: { [Op.gte]: inicio, [Op.lt]: fin },
      },
      include: [{ association: "cli" }],
    });
    const resultados = await Promise.allSettled(
      seguimientos
        .filter((seg) => seg.cli?.tel_cli)
        .map((seg) =>
          enviarMensajesWsp(933102718, `${seg.cli.tel_cli} <br/>- ${mensaje}`),
        ),
    );

    resultados.forEach((resultado, index) => {
      if (resultado.status === "rejected") {
        console.error(
          `[mensajeMembresiaPorFinalizarSeguimientoActivos] Falló el envío id_cli=${seguimientos[index]?.id_cli}:`,
          resultado.reason,
        );
      }
    });

    return true;
  } catch (error) {
    console.log(error);
  }
};
const enviarMensajeMembresiaPorFinalizar1diaAntes = async () => {
  try {
    await mensajeMembresiaPorFinalizarSeguimientoActivos(
      1,
      "dia",
      `
*Mañana* termina tu plan en Change. Queremos asegurarnos de que tengas todo listo para continuar con tu proceso.
Puedes escribirnos por aquí o acercarte a uno de nuestros asesores fitness para dejar lista tu renovación y seguir avanzando. 💪
¡No es momento de parar! 🔥
*Mensaje automático de Change The Slim Studio.*`,
    );
  } catch (error) {
    console.log(error);
  }
};
const enviarMensajeMembresiaPorFinalizar1SemanaAntes = async () => {
  try {
    await mensajeMembresiaPorFinalizarSeguimientoActivos(
      1,
      "semana",
      `
¡Ya queda poco! A tu plan en Change le queda una semana y queremos estar pendientes para que tu proceso no se detenga. 💪
El camino hacia tus objetivos continúa. Si quieres renovar, puedes escribirnos por aquí o acercarte a uno de nuestros asesores fitness para ayudarte.
¡Seguimos con todo este 2026! 🔥
*Mensaje automático de Change The Slim Studio.*`,
    );
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  mensajeMembresiaPorFinalizarSeguimientoActivos,
  enviarMensajeMembresiaPorFinalizar1diaAntes,
  enviarMensajeMembresiaPorFinalizar1SemanaAntes,
};
