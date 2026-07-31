/**
 * =============================================================================
 * Módulo: Procesamiento de Alertas de Usuario
 * =============================================================================
 *
 * CÓMO AGREGAR UN NUEVO TIPO DE ALERTA (para quien mantenga esto a futuro):
 * Solo agrega una entrada en `CALCULADORES_DE_INCREMENTO` con el id_tipo_alerta
 * como clave y una función que reciba una fecha (Date en UTC) y la mute,
 * avanzándola al momento del siguiente disparo. No hace falta tocar nada más.
 *
 * Ejemplos:
 *   9999: (fecha) => fecha.setUTCHours(fecha.getUTCHours() + 6), // cada 6 horas
 *   8888: (fecha) => avanzarAlSiguienteDiaValido(fecha, [2, 4]), // Mar y Jue
 * =============================================================================
 */

const { Sequelize, Op } = require("sequelize");
const { AlertasUsuario } = require("../models/Auditoria");
const { Parametros_3 } = require("../models/Parametros");
const { Usuario } = require("../models/Usuarios");
const { enviarMensajesWsp } = require("../config/whatssap-web");
// ---------------------------------------------------------------------------
// Constantes: evitan "números mágicos" sueltos en el código
// ---------------------------------------------------------------------------
const ESTADO_ALERTA = {
  ACTIVA: 1,
  PROCESADA: 0,
};

const VENTANA_BUSQUEDA_MS = 60_000; // +/- 1 minuto respecto a "ahora"

// ---------------------------------------------------------------------------
// Helper genérico: avanza una fecha al próximo día de semana permitido.
// diasValidos: días permitidos, 0=Domingo ... 6=Sábado.
// Reemplaza los cálculos manuales de "si es viernes +3, si no +1", que eran
// fáciles de romper al agregar/editar un patrón de días.
// ---------------------------------------------------------------------------
const avanzarAlSiguienteDiaValido = (fecha, diasValidos) => {
  for (let i = 1; i <= 7; i++) {
    const diaCandidato = (fecha.getUTCDay() + i) % 7;
    if (diasValidos.includes(diaCandidato)) {
      fecha.setUTCDate(fecha.getUTCDate() + i);
      return fecha;
    }
  }
  return fecha; // no debería alcanzarse si diasValidos no está vacío
};

// ---------------------------------------------------------------------------
// Mapa de incrementos de fecha por tipo de alerta.
// Cada función recibe la fecha ORIGINAL de la alerta y la muta in-place.
// ---------------------------------------------------------------------------
const CALCULADORES_DE_INCREMENTO = {
  1563: (fecha) => fecha.setUTCFullYear(fecha.getUTCFullYear() + 1), // Anual
  1566: (fecha) => fecha.setUTCMonth(fecha.getUTCMonth() + 1), // Mensual
  1425: (fecha) => fecha.setUTCDate(fecha.getUTCDate() + 7), // Semanal
  1426: (fecha) => fecha.setUTCDate(fecha.getUTCDate() + 1), // Diario
  1564: (fecha) => fecha.setUTCMinutes(fecha.getUTCMinutes() + 1), // Cada minuto

  1797: (fecha) => avanzarAlSiguienteDiaValido(fecha, [1, 2, 3, 4, 5]), // Lunes a viernes
  1798: (fecha) => avanzarAlSiguienteDiaValido(fecha, [1, 2, 3, 4, 5, 6]), // Lunes a sábado
  1799: (fecha) => avanzarAlSiguienteDiaValido(fecha, [1, 3, 5]), // Lunes, Miércoles, Viernes
};

/**
 * Calcula la fecha de la próxima ocurrencia de una alerta.
 *
 * IMPORTANTE: se calcula a partir de la fecha ORIGINAL de la alerta
 * (`fechaBase`), nunca a partir de "ahora". Usar la hora actual como base
 * (como hacía el código original) provoca que el horario de la alerta se
 * vaya corriendo (drift) cada vez que el cron se ejecuta con algo de retraso.
 */
const calcularProximaFecha = (idTipoAlerta, fechaBase) => {
  const proximaFecha = new Date(fechaBase);
  const calcularIncremento = CALCULADORES_DE_INCREMENTO[idTipoAlerta];

  if (!calcularIncremento) {
    console.warn(
      `[alertaUsuarioUnica] Tipo de alerta ${idTipoAlerta} sin regla de repetición definida. No se generará la siguiente ocurrencia.`,
    );
    return null;
  }

  calcularIncremento(proximaFecha);
  return proximaFecha;
};

/**
 * Envía la alerta (WhatsApp) a todos los teléfonos del grupo asociado,
 * evitando duplicados y valores vacíos.
 */
const notificarUsuariosDelGrupo = async (alerta) => {
  const telefonos = alerta.alerta_grupo.flatMap((grupo) =>
    grupo.parametros_id_2.map((usuario) => usuario.telefono_user),
  );

  const telefonosUnicos = [...new Set(telefonos.filter(Boolean))];

  await Promise.all(
    telefonosUnicos.map((telefono) =>
      enviarMensajesWsp(telefono, alerta.mensaje),
    ),
  );
};

/**
 * Procesa una única alerta:
 *  1. Notifica a los usuarios del grupo.
 *  2. Marca la alerta actual como procesada.
 *  3. Crea la siguiente ocurrencia (si el tipo de alerta define una regla).
 *
 * El paso 2 y 3 van en una transacción: si algo falla al crear la siguiente
 * ocurrencia, la alerta actual NO queda marcada como procesada "en el aire".
 */
const procesarAlerta = async (alerta) => {
  await notificarUsuariosDelGrupo(alerta);

  const proximaFecha = calcularProximaFecha(
    alerta.id_tipo_alerta,
    alerta.fecha,
  );

  await Sequelize.transaction(async (transaction) => {
    await AlertasUsuario.update(
      { flag: false, id_estado: ESTADO_ALERTA.PROCESADA },
      { where: { id: alerta.id }, transaction },
    );

    if (proximaFecha) {
      await AlertasUsuario.create(
        {
          id_grupo_usuarios: alerta.id_grupo_usuarios,
          id_tipo_alerta: alerta.id_tipo_alerta,
          mensaje: alerta.mensaje,
          fecha: proximaFecha,
          id_estado: ESTADO_ALERTA.ACTIVA,
          flag: true,
        },
        { transaction },
      );
    }
  });
};

/**
 * Punto de entrada: busca las alertas activas cuya fecha cae dentro de la
 * ventana de +/- 1 minuto respecto a "ahora", y las procesa.
 *
 * Cada alerta se procesa de forma independiente (Promise.allSettled): si una
 * falla (ej. WhatsApp caído), no bloquea ni cancela el resto.
 */
const alertaUsuarioUnica = async () => {
  console.log("ALERTAS INICIO");

  const ahora = new Date();
  const desde = new Date(ahora.getTime() - VENTANA_BUSQUEDA_MS);
  const hasta = new Date(ahora.getTime() + VENTANA_BUSQUEDA_MS);

  try {
    const alertas = await AlertasUsuario.findAll({
      where: {
        flag: true,
        id_estado: ESTADO_ALERTA.ACTIVA,
        fecha: { [Op.between]: [desde, hasta] },
      },
      include: [
        {
          model: Parametros_3,
          as: "alerta_grupo",
          include: [{ model: Usuario, as: "parametros_id_2" }],
        },
      ],
    });

    if (!alertas.length) {
      console.log("ALERTAS FIN (sin alertas pendientes)");
      return;
    }

    const resultados = await Promise.allSettled(
      alertas.map((alerta) => procesarAlerta(alerta.toJSON())),
    );

    resultados.forEach((resultado, index) => {
      if (resultado.status === "rejected") {
        console.error(
          `[alertaUsuarioUnica] Falló el procesamiento de la alerta id=${alertas[index].id}:`,
          resultado.reason,
        );
      }
    });

    console.log(`ALERTAS FIN (${alertas.length} procesadas)`);
  } catch (error) {
    console.error("[alertaUsuarioUnica]", error);
  }
};

module.exports = { alertaUsuarioUnica };
