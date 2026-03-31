const { Sequelize, Op, where, fn, col } = require("sequelize");
const { Cliente, Usuario, Empleado } = require("../models/Usuarios");
const { Venta } = require("../models/Venta");
const { enviarMensajesWsp } = require("../config/whatssap-web");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const isSameOrBefore = require("dayjs/plugin/isSameOrBefore");
const { AlertasUsuario } = require("../models/Auditoria");
const { Parametros_3 } = require("../models/Parametros");
require("dayjs/locale/es");
dayjs.locale("es");
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);
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
const alertaUsuarioUnica = async () => {
  try {
    console.log("usuario");
    const now = new Date();
    const haceUnMin = new Date(now.getTime() - 60000);
    const masUnMin = new Date(now.getTime() + 60000);
    const alertaUsuario = await AlertasUsuario.findAll({
      where: {
        flag: true,
        id_estado: 1,
        fecha: {
          [Op.between]: [now, masUnMin],
        },
      },
      include: [
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
    //FOR EACH A LOS USUARIOS, Y PASAR A MANDAR MENSAJE
    for (const alerta of alertaUsuarioMAP) {
      for (const e1 of alerta.alerta_grupo) {
        for (const e2 of e1.parametros_id_2) {
          enviarMensajesWsp(e2.telefono_user, alerta.mensaje);
        }
      }
      await AlertasUsuario.update(
        { flag: false, id_estado: 0 },
        { where: { id: alerta.id } },
      );
      //EL TIPO DE ALERTA
      const hoy = new Date();
      switch (alerta.id_tipo_alerta) {
        case 1563:
          hoy.setUTCFullYear(hoy.getUTCFullYear() + 1);
          break;
        case 1566:
          hoy.setUTCMonth(hoy.getUTCMonth() + 1 + 1);
          break;
        case 1425:
          hoy.setUTCDate(hoy.getUTCDate() + 7);
          break;
        case 1426:
          hoy.setUTCDate(hoy.getUTCDate() + 1);
          break;
        case 1564:
          hoy.setUTCMinutes(hoy.getUTCMinutes() + 1);
          break;
        default:
          break;
      }
      await AlertasUsuario.create({
        id_grupo_usuarios: alerta.id_grupo_usuarios,
        id_tipo_alerta: alerta.id_tipo_alerta,
        mensaje: alerta.mensaje,
        fecha: hoy,
        id_estado: 1,
        flag: 1,
      });
    }
    console.log("abcd");
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  alertaUsuarioUnica,
  obtenerCumpleaniosCliente,
  obtenerCumpleaniosDeEmpleados,
};
