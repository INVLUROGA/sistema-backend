const { Sequelize, Op, where, fn, col } = require("sequelize");
const { Cliente, Usuario, Empleado } = require("../models/Usuarios");
const { Venta } = require("../models/Venta");
const { enviarMensajesWsp } = require("../config/whatssap-web");
const dayjs = require("dayjs");
require("dayjs/locale/es");
dayjs.locale("es");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const isSameOrBefore = require("dayjs/plugin/isSameOrBefore");
const { AlertasUsuario, TerminologiaAlerta } = require("../models/Auditoria");
const { Parametros_3, Parametros } = require("../models/Parametros");

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);
const alertasUsuario = async () => {
  try {
    const dataAlertas = await AlertasUsuario.findAll({
      where: { flag: true, id_estado: 1 },
      include: [{ model: Usuario }],
    });
    const alertasJSON = dataAlertas.map((a) => a.toJSON());
    const ahora = dayjs().tz("America/Lima");
    const horaPeru = ahora.hour();
    const minutoActual = ahora.minute();

    const processedKeys = new Set();
    for (const alerta of alertasJSON) {
      const fechaAlerta = dayjs(alerta.fecha).tz("America/Lima");

      // 1. Validar que sea el mismo día (común para todos)
      const esMismoDia = ahora.isSame(fechaAlerta, "day");

      let coincide = false;
      const esAlertaMensual = alerta.tipo_alerta === 1425;

      if (esAlertaMensual) {
        const esHoraBatch =
          (horaPeru === 11 || horaPeru === 16) && minutoActual === 0;
        coincide = esMismoDia && esHoraBatch;
      } else {
        coincide =
          esMismoDia &&
          horaPeru === fechaAlerta.hour() &&
          minutoActual === fechaAlerta.minute();
      }
      if (coincide) {
        const mensajeLimpio = alerta.mensaje.trim().replace(/\s+/g, " ");

        const uniqueKey = `${alerta.id_user}|${alerta.tipo_alerta}|${mensajeLimpio}`;

        if (processedKeys.has(uniqueKey)) continue;
        processedKeys.add(uniqueKey);

        if (alerta.tipo_alerta === 1425 || alerta.tipo_alerta === 1428) {
          // 🔒 LOCK ATÓMICO: marcar como "en proceso" (id_estado=2) ANTES de enviar.
          // Si otra instancia ya lo tomó, el UPDATE afecta 0 filas → saltamos.
          const [filasAfectadas] = await AlertasUsuario.update(
            { id_estado: 2 },
            {
              where: {
                id: alerta.id,
                id_estado: 1, // Solo lo toma si sigue en estado 1
              },
            },
          );

          if (filasAfectadas === 0) {
            console.log(
              `[DUPLICADO EVITADO 1425] Otra instancia ya procesó la alerta id=${alerta.id}`,
            );
            continue;
          }
          // Marcar como enviada (id_estado=0) para no reenviar en siguientes ejecuciones del día
          await AlertasUsuario.update(
            { id_estado: 0 },
            { where: { id: alerta.id } },
          );
        } else {
          await AlertasUsuario.update(
            { id_estado: 0 },
            {
              where: {
                id_user: alerta.id_user,
                tipo_alerta: alerta.tipo_alerta,
                mensaje: alerta.mensaje,
                fecha: alerta.fecha,
                id_estado: 1,
              },
            },
          );

          // 2. Calculamos la nueva fecha
          let nuevaFecha = null;
          if (alerta.tipo_alerta === 1426) {
            nuevaFecha = fechaAlerta.add(1, "day");
            if (nuevaFecha.day() === 0) nuevaFecha = nuevaFecha.add(1, "day"); // Salta domingo
          } else if (alerta.tipo_alerta === 1427) {
            nuevaFecha = fechaAlerta.add(15, "day");
          }

          // 3. Creamos UN SOLO registro para el futuro usando findOrCreate para evitar condición de carrera
          if (nuevaFecha) {
            const [alertaCreada, created] = await AlertasUsuario.findOrCreate({
              where: {
                id_user: alerta.id_user,
                tipo_alerta: alerta.tipo_alerta,
                mensaje: alerta.mensaje,
                fecha: nuevaFecha.toDate(),
                id_estado: 1,
                flag: true,
              },
              defaults: {
                id_user: alerta.id_user,
                tipo_alerta: alerta.tipo_alerta,
                mensaje: alerta.mensaje,
                fecha: nuevaFecha.toDate(),
                id_estado: 1,
                flag: true,
              },
            });

            if (!created) {
              console.log(
                `[DUPLICADO EVITADO] Otra instancia ya había programado la alerta futura para: ${alerta.mensaje}`,
              );
            }
          }
          console.log({ aq: "holaaaa??????" });

          // 4. Enviamos UN SOLO mensaje
          await enviarMensajesWsp(
            alerta.auth_user.telefono_user,
            alerta.mensaje,
          );
          console.log(
            `Mensaje enviado y limpiado duplicados: ${alerta.mensaje}`,
          );
        }
      }
    }
  } catch (error) {
    console.log("Error en alertasUsuario:", error);
  }
};
const obtenerCumpleaniosCliente = async () => {
  try {
    // Obtener la fecha actual (mes y día)
    const hoy = new Date();

    const mesActual = hoy.getMonth() + 1; // Mes (0-11) → (1-12)
    const diaActual = hoy.getDate(); // Día del mes (1-31)

    // Consultar clientes que cumplen años hoy
    const ventas = await Venta.findAll({
      where: { flag: true, id_empresa: 598 },
      attributes: [
        "id",
        "id_cli",
        "id_empl",
        "id_tipoFactura",
        "numero_transac",
        "fecha_venta",
      ],
      order: [["fecha_venta", "DESC"]],
      raw: true,
      include: [
        {
          model: Cliente,
          where: {
            [Sequelize.Op.and]: [
              Sequelize.where(
                Sequelize.fn("MONTH", Sequelize.col("fecha_nacimiento")),
                mesActual,
              ),
              Sequelize.where(
                Sequelize.fn("DAY", Sequelize.col("fecha_nacimiento")),
                diaActual,
              ),
            ],
          },
          attributes: [
            ["nombre_cli", "nombres_apellidos_cli"],
            "fecha_nacimiento",
            "email_cli",
            "tel_cli",
            "sexo_cli",
          ],
        },
      ],
    });
    // console.log(ventas);
    // Creamos un Set para ir guardando los teléfonos únicos
    const seen = new Set();
    const cumpleanerosUnicos = [];

    // Recorremos cada venta y sólo añadimos si no lo hemos visto aún
    ventas.forEach((v) => {
      const tel = v["tb_cliente.tel_cli"];
      if (!seen.has(tel)) {
        seen.add(tel);
        cumpleanerosUnicos.push({
          nombres_cli: v["tb_cliente.nombres_apellidos_cli"],
          fecha_nacimiento: v["tb_cliente.fecha_nacimiento"],
          email_cli: v["tb_cliente.email_cli"],
          tel_cli: tel,
          sexo_cli: v["tb_cliente.sexo_cli"],
        });
      }
    });

    // Ahora enviamos uno a uno sin repetir
    cumpleanerosUnicos.forEach((c) => {
      enviarMensajesWsp(
        c.tel_cli,
        `
🎉 ¡FELIZ CUMPLEAÑOS, ${c.nombres_cli}! 👋🎂

En CHANGE - The Slim Studio, estamos felices de celebrar contigo este dia tan especial, por este motivo te regalamos 05 SESIONES CONSECUTIVAS para ti o para quien desees.

Recuerda que estamos aquí para seguir cambiando tu vida. ¡Que tengas un día lleno de salud y energía! ✨

¡Disfruta al máximo tu día! 
CHANGE - The Slim Studio
        
        `,
      );
    });
    enviarMensajesWsp(
      933102718,
      `
            OBTENIENDO LOS CUMPLEANIOS.... ${cumpleanerosUnicos.length}
            `,
    );
    return cumpleaneros;
  } catch (error) {
    console.error("Error al obtener los cumpleanieros:", error);
    return [];
  }
};
const obtenerCumpleaniosDeEmpleados = async () => {
  try {
    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1;
    const diaActual = hoy.getDate();

    const empleados = await Empleado.findAll({
      where: {
        [Op.and]: [
          where(fn("MONTH", col("fecha_nacimiento")), mesActual),
          where(fn("DAY", col("fecha_nacimiento")), diaActual),
          { flag: true }, // Solo empleados activos
        ],
      },
      attributes: [
        [
          fn(
            "CONCAT",
            col("nombre_empl"),
            " ",
            col("apPaterno_empl"),
            " ",
            col("apMaterno_empl"),
          ),
          "nombres_completos",
        ],
        "fecha_nacimiento",
        "email_empl",
        "telefono_empl",
        "sexo_empl",
      ],
    });
    console.log("aqui es empl", empleados, diaActual, mesActual);
    const seen = new Set();
    const cumpleanerosUnicos = [];

    empleados.forEach((e) => {
      const tel = e.telefono_empl;
      if (!seen.has(tel) && tel) {
        seen.add(tel);
        cumpleanerosUnicos.push({
          nombres_cli: e.get("nombres_completos"),
          fecha_nacimiento: new Date(e.fecha_nacimiento).setHours(
            new Date().getHours() + 5,
          ),
          email_cli: e.email_empl,
          tel_cli: tel,
          sexo_cli: e.sexo_empl,
        });
      }
    });

    cumpleanerosUnicos.forEach((c) => {
      enviarMensajesWsp(
        "120363418215042651@g.us",
        `
        🎉 ¡FELIZ CUMPLEAÑOS, ${c.nombres_cli.split(" ")[0]}! 👋🎂

        En CHANGE - The Slim Studio, estamos felices de celebrar contigo este día tan especial.

        ¡Que tengas un día lleno de salud y energía! ✨
        CHANGE - The Slim Studio
    `,
      );
    });

    enviarMensajesWsp(
      933102718,
      `OBTENIENDO LOS CUMPLEAÑOS DE EMPLEADOS.... ${cumpleanerosUnicos.length}`,
    );

    return cumpleanerosUnicos;
  } catch (error) {
    console.error("Error al obtener los cumpleanieros:", error);
    return [];
  }
};
const reactivarAlertasMensuales = async () => {
  try {
    console.log("REACTIVANDO ALERTAS MENSUALES...");
    const hoy = new Date(); // Se asume que esto corre el día 1 de cada mes

    // Calcular mes anterior
    const mesAnterior = new Date(hoy);
    mesAnterior.setMonth(mesAnterior.getMonth() - 1);
    const alertasCanceladas = await AlertasUsuario.findAll({
      where: {
        tipo_alerta: 1425,
        id_estado: { [Op.in]: [0, 1, 3] },
        flag: true,
        fecha: {
          [Op.gte]: new Date(
            mesAnterior.getFullYear(),
            mesAnterior.getMonth(),
            1,
          ),
          [Op.lt]: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
        },
      },
    });

    for (const alerta of alertasCanceladas) {
      // Generar nueva fecha para este mes usando dayjs para manejar overflows (ej: 31 Ene -> 28 Feb)
      let nuevaFecha = dayjs(alerta.fecha).add(1, "month").toDate();

      // Caso simple: Alerta MENSUAL (1425).
      if (alerta.tipo_alerta === 1425) {
        // Verificar si ya existe para no duplicar en caso de múltiples ejecuciones
        const existe = await AlertasUsuario.findOne({
          where: {
            id_user: alerta.id_user,
            tipo_alerta: 1425,
            mensaje: alerta.mensaje,
            fecha: {
              [Op.gte]: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
              [Op.lt]: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1),
            },
          },
        });

        if (!existe) {
          // Crear nueva alerta ACTIVA
          await AlertasUsuario.create({
            id_user: alerta.id_user,
            tipo_alerta: alerta.tipo_alerta,
            mensaje: alerta.mensaje,
            fecha: nuevaFecha,
            id_estado: 1, // ACTIVA
          });
        }

        // Si la vieja era estado 3 (pagada), la pasamos a 0 (procesada) para limpieza.
        // Si era 0 o 1, la dejamos igual, es histórico.
        if (alerta.id_estado === 3) {
          await alerta.update({ id_estado: 0 });
        }
      }
      // TODO: Lógica para diario/quincenal si aplica. Por ahora solo mensual es crítico.
    }
    console.log(`Reactivadas ${alertasCanceladas.length} alertas.`);
  } catch (error) {
    console.error("Error reactivando alertas:", error);
  }
};

const alertaUsuarioUnica = async () => {
  try {
    const diaActual = new Date().getDate();
    const mesActual = new Date().getMonth() + 1;
    const anioActual = new Date().getFullYear();
    const horaActual = new Date().getUTCHours();
    const minActual = new Date().getUTCMinutes();
    const alertaUsuario = await AlertasUsuario.findAll({
      where: { flag: true, id_estado: true },
      include: [
        {
          model: TerminologiaAlerta,
          as: "alerta_tipo",
        },
        {
          model: Parametros_3,
          as: "alerta_grupo",
          include: [
            {
              model: Usuario,
              as: "parametros_id_2", //USUARIO
            },
          ],
        },
      ],
    });
    //PRIMERO: FILTRAR POR FECHA, VA A COMPARAR LA FECHA CON LA FECHA_ACTUAL
    const alertaUsuarioMAP = alertaUsuario
      .map((a) => a.toJSON())
      .map((m) => {
        const fecha = new Date(m.fecha);
        const anio = fecha.getUTCFullYear();
        const mes = fecha.getUTCMonth() + 1; // 👈 enero = 0
        const dia = fecha.getUTCDate();
        const hora = fecha.getUTCHours();
        const minuto = fecha.getUTCMinutes();
        return {
          ...m,
          estructura_fecha_alerta: {
            anio,
            mes,
            dia,
            hora,
            minuto,
            fecha,
          },
        };
      });
    // .filter(
    //   (f) =>
    //     f.estructura_fecha_alerta.anio === anioActual &&
    //     f.estructura_fecha_alerta.mes === mesActual &&
    //     f.estructura_fecha_alerta.dia === diaActual &&
    //     f.estructura_fecha_alerta.hora === horaActual &&
    //     f.estructura_fecha_alerta.minuto === minActual,
    // );
    //FOR EACH A LOS USUARIOS, Y PASAR A MANDAR MENSAJE
    for (const alerta of alertaUsuarioMAP) {
      for (const e1 of alerta.alerta_grupo) {
        for (const e2 of e1.parametros_id_2) {
          enviarMensajesWsp(e2.telefono_user, alerta.mensaje);
        }
      }
    }

    //EL TIPO DE ALERTA

    for (const alerta of alertaUsuarioMAP) {
      
    }

    // VER EN ALERTA USUARIO, SI LA ALERTA {nombre_dias: 'SOLO UN DIA', dias: 1}, {nombre_dias: '', dias: 1}
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  alertaUsuarioUnica,
  obtenerCumpleaniosCliente,
  alertasUsuario,
  obtenerCumpleaniosDeEmpleados,
  reactivarAlertasMensuales,
};
