const { Sequelize, Op, where, fn, col } = require("sequelize");
const { Inversionista } = require("../models/Ingresos");
const { ExtensionMembresia } = require("../models/ExtensionMembresia");
const { ImagePT } = require("../models/Image");
const {
  ProgramaTraining,
  SemanasTraining,
} = require("../models/ProgramaTraining");
const { Cliente, Usuario, Empleado } = require("../models/Usuarios");
const {
  Venta,
  detalleVenta_membresias,
  detalleVenta_Transferencia,
  detalle_cambioPrograma,
} = require("../models/Venta");
const { request, response } = require("express");
const qs = require("qs");
const axios = require("axios");
const {
  enviarMensajesWsp,
  enviarMapaWsp__CIRCUS,
  enviarMensajesWsp__CIRCUS,
  enviarBotonesWsp,
} = require("../config/whatssap-web");
const dayjs = require("dayjs");

const { Distritos } = require("../models/Distritos");
const { Seguimiento } = require("../models/Seguimientos");

const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const isSameOrBefore = require("dayjs/plugin/isSameOrBefore");
const { Cita, eventoServicio } = require("../models/Cita");
const obtenerCitasxHorasFinales = require("./EventosCron/obtenerCitasxHorasFinales");
const { AlertasUsuario } = require("../models/Auditoria");
const { FunctionsHelpers } = require("../helpers/FunctionsHelpers");
const { messageWSP } = require("../types/types");

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);
const { calcularMinutos } = FunctionsHelpers();
// Opcional: obtener la zona horaria local
const defaultTz = dayjs.tz.guess();
const cumpleaniosSocios = async () => { };

const insertaDatosTEST = async () => {
  try {
    await enviarMensajesWsp(933102718, "PRUEBAAAAASA");
    console.log("clickeo");
  } catch (error) {
    console.log(error);
  }
};
const insertarDatosSeguimientoDeClientes = async (
  req = request,
  res = response
) => {
  try {
    //1. Hallar la ultima membresia del usuario
    const membresias = await Cliente.findAll({
      order: [["id_cli", "DESC"]],
      limit: 20,
      include: [
        {
          model: Venta,
          where: { id: 728 },
          attributes: ["id", "fecha_venta"],
          include: [
            {
              model: detalleVenta_membresias,
              attributes: ["id", "fec_inicio_mem", "fec_fin_mem"],
              required: true,
              include: [
                {
                  model: ExtensionMembresia,
                  order: [["extension_fin", "DESC"]],
                  attributes: [
                    "id",
                    "id_venta",
                    "tipo_extension",
                    "extension_inicio",
                    "extension_fin",
                  ],
                },
              ],
              // Elimina limit, ya que Sequelize no lo soporta bien en includes
            },
          ],
        },
      ],
      attributes: ["id_cli", "nombre_cli"],
      // Elimina raw: true para mantener las asociaciones anidadas
    });
    res
      .status(200)
      .json({ memebresia: obtenerUltimaVentaConExtension(membresias) });
    //2. Si el usuario tiene una extension(congelamiento o regalo) usar la fecha_fin_membresia
    //3. Si no tiene una extension, usar la fecha_fin_mem
    //4. sumar los dias
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};
// Función para obtener la última venta y la extensión más larga
const obtenerUltimaVentaConExtension = (clientes) => {
  return clientes.map((cliente) => {
    // Ordenar ventas por fecha descendente para obtener la más reciente
    const ultimaVenta = cliente.tb_venta.sort(
      (a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta)
    )[0];

    // Obtener la membresía asociada a esa venta
    const membresia = ultimaVenta.detalle_ventaMembresia[0];

    // Encontrar la extensión con el "extension_fin" más largo
    const extensionMasLarga = membresia.tb_extension_membresia.sort(
      (a, b) => new Date(b.extension_fin) - new Date(a.extension_fin)
    )[0];

    return {
      id_cli: cliente.id_cli,
      nombre_cli: cliente.nombre_cli,
      id_venta: ultimaVenta.id,
      fecha_venta: ultimaVenta.fecha_venta,
      id_membresia: membresia.id,
      fec_inicio_mem: membresia.fec_inicio_mem,
      fec_fin_mem: membresia.fec_fin_mem,
      extension_mas_larga: {
        id_extension: extensionMasLarga?.id,
        tipo_extension: extensionMasLarga?.tipo_extension,
        extension_inicio: extensionMasLarga?.extension_inicio,
        extension_fin: extensionMasLarga?.extension_fin,
      },
    };
  });
};

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
      const esMismoDia = ahora.isSame(fechaAlerta, 'day');

      let coincide = false;
      const esAlertaMensual = alerta.tipo_alerta === 1425;

      if (esAlertaMensual) {

        const esHoraBatch = (horaPeru === 11 || horaPeru === 16) && minutoActual === 0;
        coincide = esMismoDia && esHoraBatch;
      } else {

        coincide =
          esMismoDia &&
          horaPeru === fechaAlerta.hour() &&
          minutoActual === fechaAlerta.minute();
      }

      if (coincide) {
        const mensajeLimpio = alerta.mensaje.trim().replace(/\s+/g, ' ');
        const uniqueKey = `${alerta.id_user}|${alerta.tipo_alerta}|${mensajeLimpio}`;

        if (processedKeys.has(uniqueKey)) continue;
        processedKeys.add(uniqueKey);

        if (alerta.tipo_alerta === 1425) {
          const buttons = [
            { id: `btn_si_${alerta.id}`, label: "SI" },
            { id: "btn_no", label: "NO" },
          ];

          await enviarBotonesWsp(
            alerta.auth_user.telefono_user,
            `${alerta.mensaje}\n\n¿Ya realizaste el pago?\nResponde *SI* para confirmar y detener las alertas de este mes.`,
            buttons
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
                id_estado: 1
              }
            }
          );

          // 2. Calculamos la nueva fecha
          let nuevaFecha = null;
          if (alerta.tipo_alerta === 1426) {
            nuevaFecha = fechaAlerta.add(1, 'day');
            if (nuevaFecha.day() === 0) nuevaFecha = nuevaFecha.add(1, 'day'); // Salta domingo
          } else if (alerta.tipo_alerta === 1427) {
            nuevaFecha = fechaAlerta.add(15, 'day');
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
                flag: true
              },
              defaults: {
                id_user: alerta.id_user,
                tipo_alerta: alerta.tipo_alerta,
                mensaje: alerta.mensaje,
                fecha: nuevaFecha.toDate(),
                id_estado: 1,
                flag: true
              }
            });

            if (!created) {
              console.log(`[DUPLICADO EVITADO] Otra instancia ya había programado la alerta futura para: ${alerta.mensaje}`);
            }
          }

          // 4. Enviamos UN SOLO mensaje
          await enviarMensajesWsp(alerta.auth_user.telefono_user, alerta.mensaje);
          console.log(`Mensaje enviado y limpiado duplicados: ${alerta.mensaje}`);
        }
      }
    }
  } catch (error) {
    console.log("Error en alertasUsuario:", error);
  }
};
const recordatorioReservaCita24hAntes = async () => {
  try {
    console.log("Ejecutando recordatorio 24h antes...");
    const ahora = new Date();
    const en24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    const citas = await eventoServicio.findAll({
      where: {
        flag: true,
        id_empl: 3553,
      },
      include: [{ model: Cliente }, { model: Empleado }],
    });
    // Función para obtener solo la hora (en UTC o local)
    const obtenerHora = (fecha) => {
      const d = new Date(fecha);
      return d.getUTCHours(); // Usa getHours() si quieres hora local
    };

    const citasFiltradas = citas.filter(
      (cita) => obtenerHora(cita.fecha_inicio) === obtenerHora(en24h)
    );
    for (const cita of citasFiltradas) {
      const fecha_inicio = dayjs(cita.fecha_inicio).format(
        "dddd DD [de] MMMM [a las] hh:mm A"
      );
      await enviarMensajesWsp__CIRCUS(
        cita.tb_cliente.tel_cli,
        messageWSP.mensaje24hAntesDeLaReserva(
          cita.tb_empleado,
          cita.tb_cliente,
          fecha_inicio
        )
      );
      await enviarMapaWsp__CIRCUS(
        cita.tb_cliente.tel_cli,
        "CIRCUS SALON",
        -12.133150008241682,
        -77.02314616701953
      );
    }
  } catch (error) {
    console.log(error);
  }
};
const recordatorioReservaCita2hAntes = async () => {
  try {
    console.log("Ejecutando recordatorio 2h antes...");
    const ahora = new Date();
    const en24h = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
    const citas = await eventoServicio.findAll({
      where: {
        flag: true,
        id_empl: 3553,
      },
      include: [{ model: Cliente }, { model: Empleado }],
    });
    // Función para obtener solo la hora (en UTC o local)
    const mismaFechaYHoraSinMinutos = (fecha1, fecha2) => {
      const f1 = new Date(fecha1);
      const f2 = new Date(fecha2);
      return (
        f1.getUTCFullYear() === f2.getUTCFullYear() &&
        f1.getUTCMonth() === f2.getUTCMonth() &&
        f1.getUTCDate() === f2.getUTCDate()
      );
    };
    const citasFiltradas = citas.filter((cita) =>
      mismaFechaYHoraSinMinutos(cita.fecha_inicio, en24h)
    );
    for (const cita of citasFiltradas) {
      const fecha_inicio = dayjs(cita.fecha_inicio).format(
        "dddd DD [de] MMMM [a las] hh:mm A"
      );
      await enviarMensajesWsp__CIRCUS(
        cita.tb_cliente.tel_cli,
        messageWSP.mensaje2hAntesDeLaReserva(
          cita.tb_empleado,
          cita.tb_cliente,
          fecha_inicio
        )
      );
    }
  } catch (error) {
    console.log(error);
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
                mesActual
              ),
              Sequelize.where(
                Sequelize.fn("DAY", Sequelize.col("fecha_nacimiento")),
                diaActual
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
        
        `
      );
    });
    enviarMensajesWsp(
      933102718,
      `
            OBTENIENDO LOS CUMPLEANIOS.... ${cumpleanerosUnicos.length}
            `
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
            col("apMaterno_empl")
          ),
          "nombres_completos",
        ],
        "fecha_nacimiento",
        "email_empl",
        "telefono_empl",
        "sexo_empl",
      ],
    });

    const seen = new Set();
    const cumpleanerosUnicos = [];

    empleados.forEach((e) => {
      const tel = e.telefono_empl;
      if (!seen.has(tel) && tel) {
        seen.add(tel);
        cumpleanerosUnicos.push({
          nombres_cli: e.get("nombres_completos"),
          fecha_nacimiento: e.fecha_nacimiento,
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
    `
      );
    });

    enviarMensajesWsp(
      933102718,
      `OBTENIENDO LOS CUMPLEAÑOS DE EMPLEADOS.... ${cumpleanerosUnicos.length}`
    );

    return cumpleanerosUnicos;
  } catch (error) {
    console.error("Error al obtener los cumpleanieros:", error);
    return [];
  }
};
const obtenerDataSeguimiento = async () => {
  try {
    // const seguimiento = await Seguimiento.findAll();
    // console.log(seguimiento);
    // console.log("cargando---");

    const ventas = await Venta.findAll({
      where: { flag: true, id_empresa: 598 },
      raw: true, // Mantiene los datos en formato plano
      // // venta con regalo inactiva: 15549
      nest: true, // Permite anidar las relaciones correctamente
      include: [
        {
          model: Cliente,
          attributes: [
            "id_cli",
            "uid",
            [
              Sequelize.fn(
                "CONCAT",
                Sequelize.col("nombre_cli"),
                " ",
                Sequelize.col("apPaterno_cli"),
                " ",
                Sequelize.col("apMaterno_cli")
              ),
              "nombres_apellidos_cli",
            ],
            "numDoc_cli",
            "nombre_cli",
            "apPaterno_cli",
            "apMaterno_cli",
            "email_cli",
            "tel_cli",
            "ubigeo_distrito_cli",
          ],
        },
      ],
    });
    // console.log("cargando---1");
    const detalle_membresia = await detalleVenta_membresias.findAll({
      where: { flag: true },
      raw: true, // Mantiene los datos en formato plano
      // // venta con regalo inactiva: 15549
      nest: true, // Permite anidar las relaciones correctamente
    });
    // console.log("cargando---2");
    const cambioPrograma = await detalle_cambioPrograma.findAll({
      where: { flag: true },
      raw: true, // Mantiene los datos en formato plano
      // // venta con regalo inactiva: 15549
      nest: true, // Permite anidar las relaciones correctamente
    });
    // console.log("cargando---3");
    const detalle_transferencia = await detalleVenta_Transferencia.findAll({
      where: { flag: true },
      raw: true, // Mantiene los datos en formato plano
      // // venta con regalo inactiva: 15549
      nest: true, // Permite anidar las relaciones correctamente
    });
    // console.log("cargando---4");
    const membresia_extensiones = await ExtensionMembresia.findAll({
      where: { flag: true },
      raw: true, // Mantiene los datos en formato plano
      // // venta con regalo inactiva: 15549
      nest: true, // Permite anidar las relaciones correctamente
    });
    // console.log("cargando---5");
    const ventasOrganizadas = organizarDatos(
      ventas,
      detalle_membresia,
      cambioPrograma,
      detalle_transferencia,
      membresia_extensiones
    );
    // console.dir(ventasOrganizadas, { depth: null });

    // const dataSeguimiento = ventasOrganizadas.map((venta) => {
    //   const detalleMem = venta.detalle_membresia[0];
    //   const extensionMem = detalleMem?.extensionmembresia;
    //   const transferencia = venta?.detalle_transferencia;
    //   const cambios = detalleMem?.cambioPrograma;
    //   let id_venta = venta.id;
    //   let uid_cli = venta.tb_cliente.uid;
    //   let fec_inicio_mem = detalleMem.id ? detalleMem.fec_inicio_mem : null;
    //   let fec_fin_mem = detalleMem.id ? detalleMem.fec_fin_mem : "nooo";
    //   let id_pgm = detalleMem.id ? detalleMem.id_pgm : null;
    //   let id_horario = detalleMem.id ? detalleMem.id_horario : null;
    //   let id_membresia_extension = 0;
    //   let id_cambio = 0;
    //   if (extensionMem.length > 0) {
    //     const suma_dias_extension = extensionMem.reduce(
    //       (a, b) => a + Number(b.dias_habiles || 0),
    //       0
    //     );
    //     // id_membresia_extension = extensionMem.id;
    //     fec_fin_mem = sumarDiasHabiles(fec_fin_mem, suma_dias_extension);
    //   }
    //   if (transferencia.length > 0) {
    //     // fec_inicio_mem = transferencia.fec_fin_mem; // Nueva fecha de inicio
    //     fec_fin_mem = transferencia.fec_inicio_mem;
    //   }

    //   if (cambios.length > 0) {
    //     let ultimoCambio = cambios[cambios.length - 1]; // Está ordenado DESC, el primero es el último cambio
    //     // id_cambio =
    //     id_pgm = ultimoCambio.id_pgm || id_pgm;
    //     id_horario = ultimoCambio.id_horario || id_horario;
    //   }
    //   id_membresia_extension = obtenerExtensionStatus(
    //     new Date(),
    //     fec_inicio_mem,
    //     fec_fin_mem,
    //     extensionMem
    //   ).extension
    //     ? obtenerExtensionStatus(
    //         new Date(),
    //         fec_inicio_mem,
    //         fec_fin_mem,
    //         extensionMem
    //       ).extension.id
    //     : 0;
    //   console.log("ya casi");

    //   return {
    //     uid_cli,
    //     id_venta,
    //     id_cambio,
    //     id_membresia_extension: id_membresia_extension,
    //     status_periodo: obtenerExtensionStatus(
    //       new Date(),
    //       fec_inicio_mem,
    //       fec_fin_mem,
    //       extensionMem
    //     ).status,
    //     // ventaTrns: venta.venta_transferencia,
    //     // ventacam: venta.cambio_programa,
    //     sesiones_pendientes: diasHabilesRestantes(new Date(), fec_fin_mem),
    //     fecha_vencimiento: fec_fin_mem,
    //     id_pgm,
    //     id_horario,
    //   };
    // });
    // console.log("cargando---7");

    // console.log("obteniendo data seg");
    const dataSeg = calcularFechasVentas(ventasOrganizadas);
    // console.dir(dataSeg, { depth: null });

    // await Seguimiento.bulkCreate([]);
    // console.log("data seguimiento success");

    return [];
  } catch (error) {
    console.error("Error al obtener dataSeguimiento:", error);
    throw error;
  }
};
const enviarMensajesxCitasxHorasFinales = async () => {
  console.log("procedio");

  try {
    const citasConfirmadas = await Cita.findAll({
      where: {
        status_cita: "500",
      },
      raw: true,
      nest: true,
    });
    const data = await obtenerCitasxHorasFinales(
      "2min",
      new Date("1995-12-17T17:57:00"),
      citasConfirmadas
    );
    console.log(data);
  } catch (error) {
    console.log(error);
  }
};

const reactivarAlertasMensuales = async () => {
  try {
    console.log("REACTIVANDO ALERTAS MENSUALES...");
    const hoy = new Date(); // Se asume que esto corre el día 1 de cada mes

    // Calcular mes anterior
    const mesAnterior = new Date(hoy);
    mesAnterior.setMonth(mesAnterior.getMonth() - 1);

    // Buscar alertas "CANCELADAS POR PAGO" (id_estado = 3) que pertenezcan al mes pasado
    // Ojo: la fecha de la alerta cancelada es del mes pasado.
    // Se busca reactivarlas para este mes (generar nueva ocurrencia).

    const alertasCanceladas = await AlertasUsuario.findAll({
      where: {
        id_estado: 3, // Cancelado
        flag: true,
        fecha: {
          [Op.gte]: new Date(mesAnterior.getFullYear(), mesAnterior.getMonth(), 1),
          [Op.lt]: new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        }
      }
    });

    for (const alerta of alertasCanceladas) {
      // Generar nueva fecha para este mes usando dayjs para manejar overflows (ej: 31 Ene -> 28 Feb)
      let nuevaFecha = dayjs(alerta.fecha).add(1, 'month').toDate();

      // Caso simple: Alerta MENSUAL (1425).
      if (alerta.tipo_alerta === 1425) {

        // Crear nueva alerta ACTIVA
        await AlertasUsuario.create({
          id_user: alerta.id_user,
          tipo_alerta: alerta.tipo_alerta,
          mensaje: alerta.mensaje,
          fecha: nuevaFecha,
          id_estado: 1 // ACTIVA
        });

        // Marcar la vieja como PROCESADA/HISTORICO (0) para que no salga en futuras búsquedas de canceladas
        await alerta.update({ id_estado: 0 });
      }
      // TODO: Lógica para diario/quincenal si aplica. Por ahora solo mensual es crítico.
    }
    console.log(`Reactivadas ${alertasCanceladas.length} alertas.`);

  } catch (error) {
    console.error("Error reactivando alertas:", error);
  }
};
//TODO: FUNCIONES PARA ORGANIZAR DATOS
function organizarDatos(
  ventas = [],
  detalle_membresia = [],
  cambioPrograma = [],
  detalle_transferencia = [],
  membresia_extensiones = []
) {
  try {
    // Crear un mapa de membresías asociadas a ventas
    const membresiasPorVenta = detalle_membresia.reduce((acc, memb) => {
      acc[memb.id_venta] = memb;
      return acc;
    }, {});

    // Filtrar ventas que tienen membresía asociada
    const ventasConMembresia = ventas.filter(
      (venta) => membresiasPorVenta[venta.id]
    );

    // Obtener solo la última venta por cliente
    const ultimasVentas = ventasConMembresia.reduce((acc, venta) => {
      acc[venta.id_cli] = venta; // Se sobrescribe, dejando la última venta del cliente
      return acc;
    }, {});

    return Object.values(ultimasVentas).map((venta) => {
      return {
        ...venta,
        detalle_transferencia: detalle_transferencia.filter(
          (dt) => dt.id_membresia === venta.id
        ),
        detalle_membresia: detalle_membresia
          .map((membresia) => {
            return {
              ...membresia,
              extensionmembresia: membresia_extensiones.filter(
                (ext) => ext.id_venta === membresia.id_venta
              ),
              cambioPrograma: cambioPrograma.filter(
                (cp) => cp.id_venta === membresia.id_venta
              ),
            };
          })
          .filter((membresia) => membresia.id_venta === venta.id),
      };
    });
  } catch (error) {
    console.log(error);
  }
}
function isBusinessDay(date) {
  const dayOfWeek = date.getDay(); // 0: domingo, 6: sábado
  return dayOfWeek !== 0 && dayOfWeek !== 6;
}
function isBusinessDayJS(date) {
  // Verifica si el día no es sábado ni domingo
  return date.day() !== 0 && date.day() !== 6;
}
// Función auxiliar para sumar días hábiles a una fecha y almacenar cada día considerado
const addBusinessDays = (startDate, businessDays) => {
  let date = new Date(startDate);
  const diasCon = [];

  // Si no se deben agregar días, se incluye la fecha de inicio si es día hábil
  if (businessDays === 0) {
    if (isBusinessDay(date)) {
      diasCon.push(new Date(date));
    }
    return { fecha: date, diasCon };
  }

  let addedDays = 0;
  while (addedDays < businessDays) {
    date.setDate(date.getDate() + 1);
    if (isBusinessDay(date)) {
      diasCon.push(new Date(date));
      addedDays++;
    }
  }
  return { fecha: date, diasCon };
};
// Función que cuenta los días hábiles entre dos fechas de forma inclusiva,
// contando la fecha de inicio y la fecha de fin si son días hábiles.
const getBusinessDaysDiffInclusive = (start, end) => {
  // Convertir las fechas a objetos dayjs en la zona horaria local y normalizarlas a medianoche
  let startDate = dayjs(start);
  let endDate = dayjs(end);

  let diasDesc = [];

  // Si startDate es un día hábil, se incrementa en 1 día
  if (isBusinessDayJS(startDate)) {
    startDate = startDate.add(1, "day");
  }
  // Si endDate es un día hábil, se incrementa en 1 día
  if (isBusinessDayJS(endDate)) {
    endDate = endDate.add(1, "day");
  }

  // Si la fecha de inicio es mayor que la fecha final, se intercambian
  if (startDate.isAfter(endDate)) {
    [startDate, endDate] = [endDate, startDate];
  }

  let current = startDate;

  // Recorre todos los días entre startDate y endDate, incluyendo ambos
  while (current.isBefore(endDate) || current.isSame(endDate)) {
    if (isBusinessDayJS(current)) {
      // Se agrega el día si es hábil
      diasDesc.push(current.toDate());
    }
    current = current.add(1, "day");
  }
  return {
    diasDesc,
    endDate: endDate.toDate(),
    startDate: startDate.toDate(),
    dateInit: { start, end },
  };
};
// Función principal que procesa un array de ventas
function calcularFechasVentas(ventas) {
  return ventas.map((venta) => {
    // Verificar que exista al menos un detalle de membresía
    if (!venta.detalle_membresia || venta.detalle_membresia.length === 0) {
      return { id: venta.id, error: "No hay membresía asociada" };
    }

    const membresia = venta.detalle_membresia[0];
    // Convertir la fecha de fin de membresía a objeto Date
    const fechaFinMem = new Date(membresia.fec_fin_mem_oftime);
    const fechaFinMem_ = new Date(membresia.fec_fin_mem);

    // Sumar todos los días hábiles de las extensiones (si existen)
    const totalDiasHabiles =
      membresia.extensionmembresia &&
        Array.isArray(membresia.extensionmembresia)
        ? membresia.extensionmembresia.reduce(
          (sum, ext) => sum + (parseInt(ext.dias_habiles, 10) || 0),
          0
        )
        : 0;

    // Calcular la fecha de vencimiento sumando el total de días hábiles a la fecha de fin de membresía
    const { fecha: fechaVencimiento, diasCon } = addBusinessDays(
      fechaFinMem,
      totalDiasHabiles
    );

    // Calcular la diferencia en días hábiles de forma inclusiva (se cuentan endpoints si son hábiles)
    const fechaActual = new Date();
    const { faltan_dias, diasDesc, endDate, dateInit, startDate } =
      getBusinessDaysDiffInclusive(fechaActual, fechaVencimiento);

    // status_periodo: si existe extensión y la fecha actual se encuentra entre extension_inicio y extension_fin de algún objeto, se retorna ese objeto; de lo contrario, se retorna un objeto vacío.
    let status_periodo = {};
    if (
      membresia.extensionmembresia &&
      Array.isArray(membresia.extensionmembresia)
    ) {
      for (const ext of membresia.extensionmembresia) {
        const extInicio = new Date(ext.extension_inicio);
        const extFin = new Date(ext.extension_fin);
        if (fechaActual >= extInicio && fechaActual <= extFin) {
          status_periodo = ext;
          break;
        }
      }
    }

    return {
      id: venta.id,
      fecha_vencimiento: fechaVencimiento.toISOString().split("T")[0], // Formato YYYY-MM-DD
      faltan_dias,
      status_periodo,
      extensiones: membresia.extensionmembresia,
      diasContabilizados: diasDesc,
      endDate,
      dateInit,
      startDate,
      // diasCon: diasCon.map((d) => d.toISOString().split("T")[0]),
      // diasDesc: diasDesc.map((d) => d.toISOString().split("T")[0]),
      // totalDiasHabiles,
      // fec_fin_mem: fechaFinMem.toISOString().split("T")[0],
    };
  });
}
module.exports = {
  recordatorioReservaCita2hAntes,
  obtenerCumpleaniosCliente,
  insertaDatosTEST,
  insertarDatosSeguimientoDeClientes,
  organizarDatos,
  obtenerDataSeguimiento,
  enviarMensajesxCitasxHorasFinales,
  alertasUsuario,
  recordatorioReservaCita24hAntes,
  obtenerCumpleaniosDeEmpleados,
  reactivarAlertasMensuales,
};
