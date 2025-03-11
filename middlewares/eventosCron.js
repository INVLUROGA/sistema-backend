const { Sequelize } = require("sequelize");
const { Inversionista } = require("../models/Aportes");
const { ExtensionMembresia } = require("../models/ExtensionMembresia");
const { ImagePT } = require("../models/Image");
const {
  ProgramaTraining,
  SemanasTraining,
} = require("../models/ProgramaTraining");
const { Cliente } = require("../models/Usuarios");
const {
  Venta,
  detalleVenta_membresias,
  detalleVenta_Transferencia,
  detalle_cambioPrograma,
} = require("../models/Venta");
const { request, response } = require("express");
const qs = require("qs");
const axios = require("axios");
const { enviarMensajesWsp } = require("../config/whatssap-web");
const dayjs = require("dayjs");

const utc = require("dayjs/plugin/utc");
const { Distritos } = require("../models/Distritos");
const { Seguimiento } = require("../models/Seguimientos");

// dayjs.extend(isBetween);

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
    // enviarMensajesWsp(
    //   933102718,
    //   `
    //         OBTENIENDO LOS CUMPLEANIOS....
    //         `
    // );
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

    // Crear un array con los nombres completos
    const cumpleaneros = ventas.map((cliente) => {
      return {
        nombres_cli: `${cliente["tb_cliente.nombres_apellidos_cli"]}`,
        fecha_nacimiento: `${cliente["tb_cliente.fecha_nacimiento"]}`,
        email_cli: `${cliente["tb_cliente.email_cli"]}`,
        tel_cli: `${cliente["tb_cliente.tel_cli"]}`,
        sexo_cli: `${cliente["tb_cliente.sexo_cli"]}`,
      };
    });
    // enviarMensajesWsp(
    //   933102718,
    //   `
    //   TODO LOS CUMPLEANIOS OBTENIDOS DE HOY DIA: ${cumpleaneros.length}
    //   `
    // );
    cumpleaneros.map((c) => {
      enviarMensajesWsp(
        c.tel_cli,
        `
🎉 ¡FELIZ CUMPLEAÑOS, ${c.nombres_cli}! 👋🎂

En CHANGE - The Slim Studio, estamos felices de celebrar contigo este dia tan especial, por este motivo te regalamos 10 SESIONES CONSECUTIVAS para ti o para quien desees.

Recuerda que estamos aquí para seguir cambiando tu vida. ¡Que tengas un día lleno de salud y energía! ✨

¡Disfruta al máximo tu día! 
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
const obtenerCitasDosHorasAntes = () => {
  try {
  } catch (error) {
    console.log(error);
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
    console.dir(ventasOrganizadas, { depth: null });

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
    console.log("cargando---7");

    console.log("obteniendo data seg");
    const dataSeg = calcularFechaVencimiento(ventasOrganizadas);
    console.log(dataSeg);

    // await Seguimiento.bulkCreate([]);
    console.log("data seguimiento success");

    return [];
  } catch (error) {
    console.error("Error al obtener dataSeguimiento:", error);
    throw error;
  }
};
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
const esDiaHabil = (fecha) => {
  const dia = fecha.getDay();
  return dia !== 0 && dia !== 6; // No cuenta sábados (6) ni domingos (0)
};
function diasHabilesRestantes(fecInicio, fecFin) {
  // const inicio = new Date(fecInicio);
  // const fin = new Date(fecFin);
  // let diasHabiles = 0;

  // while (inicio <= fin) {
  //   const dia = inicio.getDay();
  //   if (dia !== 0 && dia !== 6) diasHabiles++; // Excluir sábados (6) y domingos (0)
  //   inicio.setDate(inicio.getDate() + 1);
  // }
  // Determinar si ambas fechas son hábiles

  // return diasHabiles;
  let inicio = dayjs(fecInicio);
  let fin = dayjs(fecFin);

  // Determinar la dirección del conteo
  let step = inicio.isBefore(fin) ? 1 : -1;

  // Asegurar que inicio siempre sea menor para calcular correctamente
  if (step === -1) {
    [inicio, fin] = [fin, inicio]; // Intercambia valores
  }

  let totalDias = fin.diff(inicio, "day") + 1; // Contamos ambos extremos
  let semanasCompletas = Math.floor(totalDias / 7);
  let diasHabiles = semanasCompletas * 5; // Cada semana completa tiene 5 días hábiles

  let extra = 0;
  for (let i = 0; i < totalDias % 7; i++) {
    let dia = inicio.add(i, "day").day();
    if (dia !== 0 && dia !== 6) extra++; // Excluir sábados (6) y domingos (0)
  }

  return step * (diasHabiles + extra);
}
function sumarDiasHabiles(fecha, numeroDias) {
  const fechaInicial = new Date(fecha);
  let diasAgregados = 0;

  if (esDiaHabil(fechaInicial)) diasAgregados++;

  while (diasAgregados < numeroDias) {
    fechaInicial.setDate(fechaInicial.getDate() + 1);
    const dia = fechaInicial.getDay();
    if (dia !== 0 && dia !== 6) diasAgregados++; // Excluir sábados (6) y domingos (0)
  }

  return fechaInicial.toISOString().split("T")[0]; // Retorna en formato YYYY-MM-DD
}
const obtenerExtensionStatus = (
  fecha_actual,
  fecha_inicio_mem,
  fecha_fin_mem,
  extensiones
) => {
  const fechaActual = new Date(fecha_actual);
  const inicioMem = new Date(fecha_inicio_mem);
  const finMem = new Date(fecha_fin_mem);

  // Buscar una extensión donde la fecha actual esté entre extension_inicio y extension_fin
  const extension = extensiones.find((ext) => {
    const inicioExt = new Date(ext.extension_inicio);
    const finExt = new Date(ext.extension_fin);
    return fechaActual >= inicioExt && fechaActual <= finExt;
  });

  if (extension) {
    return { extension, status: extension.tipo_extension };
  }

  // Evaluar el estado si no hay extensión activa en la fecha actual
  if (fechaActual < inicioMem) return { extension: null, status: "espera" };
  if (fechaActual > finMem) return { extension: null, status: "inactivo" };

  return { extension: null, status: "activo" };
};

const addBusinessDays = (startDate, businessDays) => {
  let date = dayjs(startDate);
  let addedDays = 0;

  while (addedDays < businessDays) {
    date = date.add(1, "day");
    if (date.day() >= 1 && date.day() <= 5) {
      // Solo lunes a viernes
      addedDays++;
    }
  }

  return date;
};

const calcularFechaVencimiento = (ventas) => {
  return ventas.map((venta) => {
    if (!venta.detalle_membresia || venta.detalle_membresia.length === 0) {
      return { id_venta: venta.id, error: "No hay membresía asociada" };
    }

    let membresia = venta.detalle_membresia[0];
    let fecFinMem = dayjs(membresia.fec_fin_mem); // Convertir fecha de fin de membresía

    // Calcular el total de días hábiles sumando todas las extensiones
    let totalDiasHabiles =
      membresia.extensionmembresia?.reduce(
        (sum, ext) => sum + (parseInt(ext.dias_habiles, 10) || 0),
        0
      ) || 0;

    // Calcular la nueva fecha de vencimiento con días hábiles
    let fechaVencimiento = addBusinessDays(fecFinMem, totalDiasHabiles);

    // Calcular diferencia entre fecha actual y fecha de vencimiento
    let fechaActual = dayjs(); // Fecha actual
    let faltaDias = fechaVencimiento.diff(fechaActual, "day"); // Ahora es precisa

    return {
      id_venta: venta.id,
      fecha_vencimiento: fechaVencimiento.format("YYYY-MM-DD"),
      falta_dias: faltaDias, // Puede ser negativo si ya venció
    };
  });
};

const obtenerCitasDosDiasAntes = () => {};
module.exports = {
  obtenerCumpleaniosCliente,
  insertaDatosTEST,
  insertarDatosSeguimientoDeClientes,
  obtenerCitasDosHorasAntes,
  obtenerCitasDosDiasAntes,
  obtenerDataSeguimiento,
};
