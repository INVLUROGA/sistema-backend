const { Op } = require("sequelize");
const { Seguimiento } = require("../../models/Seguimientos");
const { enviarMensajesWsp } = require("../../config/whatssap-web");

// El server corre en UTC y Perú es UTC-5 todo el año (sin horario de verano).
// "mes" y "año" son unidades de largo variable (28-31 días, 365-366 días), así
// que para sumarlas hay que hacerlo sobre el calendario de Perú: si no,
// cuando el cron corre entre 00:00 y 05:00 UTC (7pm-11:59pm del día anterior
// en Perú) el día-del-mes usado como base sería el de UTC, no el de Perú, y
// el resultado puede desfasarse varios días alrededor de fin de mes.
// "dia" y "semana" no tienen este problema (sumar N días es un desplazamiento
// fijo en el tiempo, sin importar la zona horaria), pero se calculan igual
// para mantener consistencia con obtenerDataSeguimientos.js.
const OFFSET_PERU_MS = 5 * 60 * 60 * 1000;
const obtenerFechaPeru = (fecha = new Date()) =>
  new Date(new Date(fecha).getTime() - OFFSET_PERU_MS);

const CALCULADORES_DE_TIEMPO = {
  dia: (fecha, numero) => fecha.setUTCDate(fecha.getUTCDate() + numero),
  semana: (fecha, numero) => fecha.setUTCDate(fecha.getUTCDate() + numero * 7),
  mes: (fecha, numero) => fecha.setUTCMonth(fecha.getUTCMonth() + numero),
  año: (fecha, numero) => fecha.setUTCFullYear(fecha.getUTCFullYear() + numero),
};

const calcularFechaLimite = (numero, tiempo) => {
  const calcularIncremento = CALCULADORES_DE_TIEMPO[tiempo];

  if (!calcularIncremento) {
    throw new Error(
      `Tiempo "${tiempo}" inválido. Usa: ${Object.keys(CALCULADORES_DE_TIEMPO).join(", ")}`,
    );
  }

  const fechaLimite = obtenerFechaPeru();
  calcularIncremento(fechaLimite, numero);
  return new Date(fechaLimite.getTime() + OFFSET_PERU_MS);
};

const mensajeMembresiaPorFinalizarSeguimientoActivos = async (
  numero,
  tiempo,
  mensaje,
) => {
  try {
    const ahora = new Date();
    const fechaLimite = calcularFechaLimite(numero, tiempo);

    const seguimientos = await Seguimiento.findAll({
      where: {
        flag: true,
        fecha_vencimiento: { [Op.between]: [ahora, fechaLimite] },
      },
      include: [{ association: "cli" }],
    });
    const resultados = await Promise.allSettled(
      seguimientos
        .filter((seg) => seg.cli?.tel_cli)
        .map((seg) => enviarMensajesWsp(seg.cli.tel_cli, mensaje)),
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
