const { Op, UniqueConstraintError } = require("sequelize");
const { Seguimiento } = require("../../models/Seguimientos");
const { MensajeMembresia } = require("../../models/MensajeMembresia");
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

// Devuelve [inicio, fin) del día de Perú hoy + numero/tiempo, como instantes UTC,
// y ese día en formato YYYY-MM-DD.
const calcularRangoDiaObjetivo = (numero, tiempo, ahora = new Date()) => {
  const calcularIncremento = CALCULADORES_DE_TIEMPO[tiempo];

  if (!calcularIncremento) {
    throw new Error(
      `Tiempo "${tiempo}" inválido. Usa: ${Object.keys(CALCULADORES_DE_TIEMPO).join(", ")}`,
    );
  }

  const diaObjetivo = obtenerFechaPeru(ahora);
  diaObjetivo.setUTCHours(0, 0, 0, 0);
  calcularIncremento(diaObjetivo, numero);

  const inicio = new Date(diaObjetivo.getTime() + OFFSET_PERU_MS);
  const fin = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  return { inicio, fin, dia: diaObjetivo.toISOString().slice(0, 10) };
};

// Teléfono normalizado (solo dígitos) para no duplicar "966 713 466" y "966713466"
const normalizarTelefono = (telefono) => String(telefono ?? "").replace(/\D/g, "");

/// Clientes con seguimiento activo que vencen en el día objetivo, uno por teléfono.
const obtenerDestinatarios = async (numero, tiempo, ahora = new Date()) => {
  const { inicio, fin, dia } = calcularRangoDiaObjetivo(numero, tiempo, ahora);

  const seguimientos = await Seguimiento.findAll({
    where: {
      flag: true,
      fecha_vencimiento: { [Op.gte]: inicio, [Op.lt]: fin },
    },
    include: [{ association: "cli" }],
  });

  // Un mensaje por teléfono: dos seguimientos del mismo cliente, o dos clientes
  // que comparten teléfono, reciben un solo aviso.
  const porTelefono = new Map();
  for (const seg of seguimientos) {
    const telefono = normalizarTelefono(seg.cli?.tel_cli);
    if (telefono && !porTelefono.has(telefono)) {
      porTelefono.set(telefono, { telefono, id_cli: seg.id_cli });
    }
  }
  return { dia, destinatarios: [...porTelefono.values()] };
};

/// Envía el aviso UNA sola vez por (tipo, teléfono, día de vencimiento).
/// Antes de enviar se reserva el envío en tb_mensaje_membresia (índice único):
/// si ya existe (otro servidor, un reinicio, una segunda ejecución), se omite.
const mensajeMembresiaPorFinalizarSeguimientoActivos = async (
  numero,
  tiempo,
  mensaje,
) => {
  const tipo = `${numero}-${tiempo}`;
  const resumen = { tipo, enviados: 0, omitidos: 0, errores: 0 };
  try {
    const { dia, destinatarios } = await obtenerDestinatarios(numero, tiempo);

    // Envíos uno por uno para no saturar la API de WhatsApp
    for (const { telefono, id_cli } of destinatarios) {
      let registro;
      try {
        registro = await MensajeMembresia.create({
          tipo,
          telefono,
          fecha_vencimiento: dia,
          id_cli,
        });
      } catch (error) {
        if (error instanceof UniqueConstraintError) {
          resumen.omitidos++; // ya se envió (o se está enviando) este aviso
          continue;
        }
        throw error;
      }

      const respuesta = await enviarMensajesWsp(telefono, `${mensaje}`);
      const errorEnvio = !respuesta?.ok
        ? respuesta?.msg || "Error desconocido"
        : respuesta.data?.error
          ? JSON.stringify(respuesta.data.error)
          : null;

      // No se reintenta automáticamente: un error de red puede haber enviado igual
      await registro.update({
        estado: errorEnvio ? "error" : "enviado",
        detalle: errorEnvio ? String(errorEnvio).slice(0, 500) : null,
      });
      if (errorEnvio) {
        resumen.errores++;
        console.error(
          `[mensajeMembresiaPorFinalizar ${tipo}] Falló el envío id_cli=${id_cli} tel=${telefono}: ${errorEnvio}`,
        );
      } else {
        resumen.enviados++;
      }
    }

    console.log(
      `[mensajeMembresiaPorFinalizar ${tipo}] vencen el ${dia}: ${resumen.enviados} enviados, ${resumen.omitidos} ya enviados antes, ${resumen.errores} con error`,
    );
    return resumen;
  } catch (error) {
    console.error(`[mensajeMembresiaPorFinalizar ${tipo}] Error`, error);
    return { ...resumen, error: error.message };
  }
};
const enviarMensajeMembresiaPorFinalizar1diaAntes = async () => {
  try {
    return await mensajeMembresiaPorFinalizarSeguimientoActivos(
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
    return await mensajeMembresiaPorFinalizarSeguimientoActivos(
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
  calcularRangoDiaObjetivo,
  obtenerDestinatarios,
  mensajeMembresiaPorFinalizarSeguimientoActivos,
  enviarMensajeMembresiaPorFinalizar1diaAntes,
  enviarMensajeMembresiaPorFinalizar1SemanaAntes,
};
