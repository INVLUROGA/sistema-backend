const { Sequelize } = require("sequelize");
const { Inversionista } = require("../models/Aportes");
const { ExtensionMembresia } = require("../models/ExtensionMembresia");
const { ImagePT } = require("../models/Image");
const {
  ProgramaTraining,
  SemanasTraining,
} = require("../models/ProgramaTraining");
const { Cliente } = require("../models/Usuarios");
const { Venta, detalleVenta_membresias } = require("../models/Venta");
const { request, response } = require("express");
const qs = require("qs");
const axios = require("axios");
const { enviarMensajesWsp } = require("../config/whatssap-web");
const dayjs = require("dayjs");

const utc = require("dayjs/plugin/utc");
// Cargar el plugin
dayjs.extend(utc);

const cumpleaniosSocios = async () => {};

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

const obtenerUltimaVenta = (clientes) => {
  return clientes.map((cliente) => {
    // Obtener la última venta según la fecha de venta
    let ultimaVenta = cliente.tb_venta.reduce((ultima, actual) => {
      return new Date(actual.fecha_venta) > new Date(ultima.fecha_venta)
        ? actual
        : ultima;
    });
    // Retornar los datos del cliente con su última venta
    return {
      id_cli: cliente.id_cli,
      nombre_cli: cliente.nombre_cli,
      ultima_venta: ultimaVenta,
    };
  });
};

const obtenerUltimaExtension = (ultima_venta) => {
  // Obtener la última extensión según la fecha de extensión_fin
  const ultimaExtension = ultima_venta.tb_extension_membresia?.reduce(
    (ultima, actual) => {
      return new Date(actual.extension_fin) > new Date(ultima.extension_fin)
        ? actual
        : ultima;
    }
  );
  return ultimaExtension;
};
const procesarClientes = (clientes) => {
  return clientes.map((cliente) => {
    // Procesar las extensiones en la última venta
    const detalleMembresia = cliente.ultima_venta.detalle_ventaMembresia.map(
      (membresia) => {
        if (membresia.tb_extension_membresia.length > 0) {
          // Seleccionar la extensión con la fecha de extension_fin más grande
          const ultimaExtension = membresia.tb_extension_membresia.reduce(
            (max, actual) => {
              return new Date(actual.extension_fin) >
                new Date(max.extension_fin)
                ? actual
                : max;
            }
          );
          // Asignar la última extensión
          membresia.ultima_extension = ultimaExtension;
        } else {
          membresia.ultima_extension = null; // Si no hay extensiones
        }
        return membresia;
      }
    );

    // Retornar el cliente con la membresía procesada
    return {
      ...cliente,
      ultima_venta: {
        ...cliente.ultima_venta,
        detalle_ventaMembresia: detalleMembresia,
      },
    };
  });
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
          ],
        },
      ],
    });
    // console.log(ventas);

    // Crear un array con los nombres completos
    const cumpleaneros = ventas.map((cliente) => {
      return {
        nombres_cli: `${cliente["tb_cliente.nombres_apellidos_cli"]}`,
        fecha_nacimiento: `${cliente["tb_cliente.fecha_nacimiento"]}`,
        email_cli: `${cliente["tb_cliente.email_cli"]}`,
        tel_cli: `${cliente["tb_cliente.tel_cli"]}`,
      };
    });
    cumpleaneros.map((c) => {
      enviarMensajesWsp(
        c.tel_cli,
        `
        
🎉 ¡FELIZ CUMPLEAÑOS! 🎉

¡Hola, ${c.nombres_cli}! 👋🎂

En CHANGE - The Slim Studio, estamos muy felices de acompañarte en este día tan especial. 🎈💪 Deseamos que este nuevo año esté lleno de salud, metas alcanzadas y muchos logros personales.

Recuerda que estamos aquí para seguir transformando tu vida. ¡Que tengas un día increíble y lleno de energía! ✨

¡Disfruta al máximo tu día! 🥳
Atentamente,
CHANGE - The Slim Studio
        
        `
      );
    });
    return cumpleaneros;
  } catch (error) {
    console.error("Error al obtener los cumpleanieros:", error);
    return [];
  }
};
module.exports = {
  obtenerCumpleaniosCliente,
  insertaDatosTEST,
  insertarDatosSeguimientoDeClientes,
};
