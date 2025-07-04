const { Op, fn, col, literal, QueryTypes, Sequelize } = require("sequelize");
const { ExtensionMembresia } = require("../models/ExtensionMembresia");
const { Cliente, Empleado } = require("../models/Usuarios");
const {
  detalleVenta_membresias,
  Venta,
  detalleVenta_producto,
  detalleVenta_citas,
  detalleVenta_pagoVenta,
  detalleVenta_Transferencia,
} = require("../models/Venta");
const {
  ProgramaTraining,
  SemanasTraining,
} = require("../models/ProgramaTraining");
const { request, response } = require("express");
const { db } = require("../database/sequelizeConnection");
const dayjs = require("dayjs");
const { Proveedor } = require("../models/Proveedor");
const { ParametroGastos, Gastos } = require("../models/GastosFyV");
const { Parametros } = require("../models/Parametros");
const { Aporte } = require("../models/Aportes");
const { ImagePT } = require("../models/Image");
const { Producto } = require("../models/Producto");
const { Servicios } = require("../models/Servicios");
const { Distritos } = require("../models/Distritos");
const { Marcacion } = require("../models/Marcacion");

// Función para sumar días hábiles (lunes y viernes) a una fecha
function addBusinessDays(startDate, numberOfDays) {
  const currentDate = new Date(startDate);
  currentDate.setDate(currentDate.getDate() + numberOfDays);
  return currentDate;

}
const diasLaborables = (fechaInicio, fechaFin) => {
  let diasLaborables = 0;
  const fechaInicioParsed = dayjs(fechaInicio, "YYYY-MM-DD");
  const fechaFinParsed = dayjs(fechaFin, "YYYY-MM-DD");

  // Determina la dirección de la iteración
  const direccion = fechaFinParsed.isAfter(fechaInicioParsed) ? 1 : -1;

  // Calcula el número total de días
  const totalDias = Math.abs(fechaFinParsed.diff(fechaInicioParsed, "day")) + 1;

  // Inicializa fechaActual
  let fechaActual = fechaInicioParsed;

  // Itera sobre el rango de días
  for (let i = 0; i < totalDias; i++) {
    // Si el día actual es laborable (de lunes a viernes)
    if (fechaActual.day() !== 0 && fechaActual.day() !== 6) {
      diasLaborables += direccion;
    }
    fechaActual = fechaActual.add(direccion, "day");
  }

  return diasLaborables;
};
const getReporteSeguimiento = async (req, res) => {
  const { isClienteActive } = req.query;
  const { id_empresa } = req.params;
  try {
    const currentDate = new Date();
    let membresias = await detalleVenta_membresias.findAll({
      attributes: ["id", "fec_inicio_mem", "horario", "fec_fin_mem"],
      order: [["id", "DESC"]],
      include: [
        {
          model: ExtensionMembresia,
          attributes: [
            "tipo_extension",
            "extension_inicio",
            "extension_fin",
            "dias_habiles",
          ],
        },
        {
          model: Venta,
          attributes: ["id", "fecha_venta", "id_tipoFactura"],
          where: { id_empresa: id_empresa },
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
              include: [
                {
                  as: "ubigeo_nac",
                  model: Distritos,
                },
                // {
                //   model: Marcacion,
                // },
              ],
            },
          ],
        },
        {
          model: ProgramaTraining,
          attributes: ["id_pgm", "name_pgm"],
          where: { estado_pgm: true, flag: true },
          include: [
            {
              model: ImagePT,
              attributes: ["name_image", "width", "height", "id"],
            },
          ],
        },
        {
          model: SemanasTraining,
          attributes: ["id_st", "semanas_st"],
        },
      ],
    });

    let transferenciasMembresias = await detalleVenta_Transferencia.findAll({
      order: [["id", "DESC"]],
      raw: true,
      include: [
        {
          model: Venta,
          attributes: ["id", "fecha_venta"],
          as: "venta_venta",
          where: { id_empresa: id_empresa },
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
                "nombre_cli",
                "apPaterno_cli",
                "apMaterno_cli",
                "email_cli",
                "tel_cli",
                "ubigeo_distrito_cli",
                "numDoc_cli",
              ],
              include: [
                {
                  as: "ubigeo_nac",
                  model: Distritos,
                },
              ],
            },
          ],
        },
        {
          model: Venta,
          as: "venta_transferencia",
        },
      ],
    });

    console.log({ membresias, transferenciasMembresias });

    // 1. Procesamiento de membresías
    let processedMembresias = membresias.map((item) => {
      const itemJSON = item.toJSON();
      const tbExtensionMembresia = itemJSON.tb_extension_membresia || [];

      if (tbExtensionMembresia.length === 0) {
        // Si tb_extension_membresia está vacío
        return {
          ...itemJSON,
          dias: 0,
          fec_fin_mem_new: new Date(itemJSON.fec_fin_mem), // La nueva fecha es igual a fec_fin_mem
        };
      }

      const totalDiasHabiles = tbExtensionMembresia.reduce(
        (total, ext) => total + parseInt(ext.dias_habiles, 10),
        0
      );

      // Calcular la nueva fecha sumando los días hábiles a 'fec_fin_mem'
      const fecFinMem = new Date(itemJSON.fec_fin_mem);
      const fecFinMemNew = addBusinessDays(fecFinMem, totalDiasHabiles);

      return {
        dias: totalDiasHabiles,
        fec_fin_mem_new: fecFinMemNew, // Ajusta el formato según tus necesidades
        ...itemJSON,
      };
    });

    // 2. Filtrar por la última membresía de cada cliente
    let uniqueMembresias = Object.values(
      processedMembresias.reduce((acc, item) => {
        const clienteId = item.tb_ventum.tb_cliente.id_cli;
        const currentEntry = acc[clienteId];

        // Si no existe aún o la nueva membresía tiene una fecha de finalización posterior
        if (
          !currentEntry ||
          new Date(item.fec_fin_mem_new) >
            new Date(currentEntry.fec_fin_mem_new)
        ) {
          acc[clienteId] = item; // Guardar la membresía más reciente
        }
        return acc;
      }, {})
    );

    // 3. Filtrado basado en `isClienteActive`
    let filteredMembresias = uniqueMembresias.filter((item) => {
      const fecFinMemNewDate = new Date(item.fec_fin_mem_new);
      if (isClienteActive === "true") {
        return fecFinMemNewDate > currentDate;
      } else if (isClienteActive === "false") {
        return fecFinMemNewDate < currentDate;
      }
      return true;
    });

    // 4. Ordenación según `isClienteActive`
    filteredMembresias.sort((a, b) => {
      const dateA = new Date(a.fec_fin_mem_new);
      const dateB = new Date(b.fec_fin_mem_new);
      if (isClienteActive === "true") {
        return dateA - dateB; // Ordenar de menor a mayor
      } else if (isClienteActive === "false") {
        return dateB - dateA; // Ordenar de mayor a menor
      }
      return 0; // No aplicar orden si isClienteActive no está definido
    });

    res.status(200).json({
      newMembresias: relacionarTransferencias(
        transferenciasMembresias,
        filteredMembresias
      ),
    });
  } catch (error) {
    console.log(error);
    res.status(505).json({
      error: error,
    });
  }
};
const getReporteSeguimientoClientes = async (req, res) => {
  const { isClienteActive } = req.query;
  const { id_empresa } = req.params;
  try {
    const currentDate = new Date();
    let membresias = await detalleVenta_membresias.findAll({
      attributes: ["id", "fec_inicio_mem", "horario", "fec_fin_mem"],
      order: [["id", "DESC"]],
      include: [
        {
          model: ExtensionMembresia,
          attributes: [
            "tipo_extension",
            "extension_inicio",
            "extension_fin",
            "dias_habiles",
          ],
        },
        {
          model: Venta,
          attributes: ["id", "fecha_venta", "id_tipoFactura"],
          where: { id_empresa: id_empresa },
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
              include: [
                {
                  model: Distritos,
                },
                // {
                //   model: Marcacion,
                // },
              ],
            },
          ],
        },
        {
          model: ProgramaTraining,
          attributes: ["id_pgm", "name_pgm"],
          where: { estado_pgm: true, flag: true },
          include: [
            {
              model: ImagePT,
              attributes: ["name_image", "width", "height", "id"],
            },
          ],
        },
        {
          model: SemanasTraining,
          attributes: ["id_st", "semanas_st"],
        },
      ],
    });

    let transferenciasMembresias = await detalleVenta_Transferencia.findAll({
      order: [["id", "DESC"]],
      raw: true,
      include: [
        {
          model: Venta,
          attributes: ["id", "fecha_venta"],
          as: "venta_venta",
          where: { id_empresa: id_empresa },
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
                "nombre_cli",
                "apPaterno_cli",
                "apMaterno_cli",
                "email_cli",
                "tel_cli",
                "ubigeo_distrito_cli",
                "numDoc_cli",
              ],
              include: [
                {
                  model: Distritos,
                },
              ],
            },
          ],
        },
        {
          model: Venta,
          as: "venta_transferencia",
        },
      ],
    });

    // 1. Procesamiento de membresías
    let processedMembresias = membresias.map((item) => {
      const itemJSON = item.toJSON();
      const tbExtensionMembresia = itemJSON.tb_extension_membresia || [];

      if (tbExtensionMembresia.length === 0) {
        // Si tb_extension_membresia está vacío
        return {
          ...itemJSON,
          dias: 0,
          fec_fin_mem_new: new Date(itemJSON.fec_fin_mem), // La nueva fecha es igual a fec_fin_mem
        };
      }

      const totalDiasHabiles = tbExtensionMembresia.reduce(
        (total, ext) => total + parseInt(ext.dias_habiles, 10),
        0
      );

      // Calcular la nueva fecha sumando los días hábiles a 'fec_fin_mem'
      const fecFinMem = new Date(itemJSON.fec_fin_mem);
      const fecFinMemNew = addBusinessDays(fecFinMem, totalDiasHabiles);

      return {
        dias: totalDiasHabiles,
        fec_fin_mem_new: fecFinMemNew, // Ajusta el formato según tus necesidades
        ...itemJSON,
      };
    });

    // 2. Filtrar por la última membresía de cada cliente
    let uniqueMembresias = Object.values(
      processedMembresias.reduce((acc, item) => {
        const clienteId = item.tb_ventum.tb_cliente.id_cli;
        const currentEntry = acc[clienteId];

        // Si no existe aún o la nueva membresía tiene una fecha de finalización posterior
        if (
          !currentEntry ||
          new Date(item.fec_fin_mem_new) >
            new Date(currentEntry.fec_fin_mem_new)
        ) {
          acc[clienteId] = item; // Guardar la membresía más reciente
        }
        return acc;
      }, {})
    );

    // 3. Filtrado basado en `isClienteActive`
    let filteredMembresias = uniqueMembresias.filter((item) => {
      const fecFinMemNewDate = new Date(item.fec_fin_mem_new);
      if (isClienteActive === "true") {
        return fecFinMemNewDate > currentDate;
      } else if (isClienteActive === "false") {
        return fecFinMemNewDate < currentDate;
      }
      return true;
    });

    // 4. Ordenación según `isClienteActive`
    filteredMembresias.sort((a, b) => {
      const dateA = new Date(a.fec_fin_mem_new);
      const dateB = new Date(b.fec_fin_mem_new);
      if (isClienteActive === "true") {
        return dateA - dateB; // Ordenar de menor a mayor
      } else if (isClienteActive === "false") {
        return dateB - dateA; // Ordenar de mayor a menor
      }
      return 0; // No aplicar orden si isClienteActive no está definido
    });

    res.status(200).json({
      newMembresias: relacionarTransferencias(
        transferenciasMembresias,
        filteredMembresias
      ),
    });
  } catch (error) {
    console.log(error);
    res.status(505).json({
      error: error,
    });
  }
};

const getReporteProgramas = async (req, res) => {};
const getReporteVentasPrograma_COMPARATIVACONMEJORANO = async (
  req = request,
  res = response
) => {
  const { id_programa, rangoDate } = req.query;
  try {
    let ventasMEJORANIO = await Venta.findAll({
      attributes: [
        [fn("YEAR", col("fecha_venta")), "anio"],
        [fn("MONTH", col("fecha_venta")), "mes"],
        [
          fn("SUM", col("detalle_ventaMembresia.tarifa_monto")),
          "total_mensual",
        ],
      ],
      where: { flag: true },
      include: [
        {
          model: detalleVenta_membresias,
          attributes: [],
          where: { id_pgm: id_programa },
        },
      ],
      group: [fn("YEAR", col("fecha_venta")), fn("MONTH", col("fecha_venta"))],
      raw: true,
    });
    if (ventasMEJORANIO.length <= 0) {
      ventasMEJORANIO = [
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 1,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 2,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 3,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 4,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 5,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 6,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 7,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 8,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 9,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 10,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 11,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 12,
          total_mensual: 0,
        },
      ];
    }
    // Paso 2: Seleccionar el año con el mayor total de ventas
    const ventasAnualesMEJORANIO = ventasMEJORANIO.reduce((acc, venta) => {
      const { anio, total_mensual } = venta;
      acc[anio] = (acc[anio] || 0) + parseFloat(total_mensual);
      return acc;
    }, {});

    const bestYear = Object.keys(ventasAnualesMEJORANIO).reduce((a, b) =>
      ventasAnualesMEJORANIO[a] > ventasAnualesMEJORANIO[b] ? a : b
    );

    // Paso 3: Obtener las ventas mensuales para el mejor año
    const ventasMensualesMejorAnio = ventasMEJORANIO.filter(
      (venta) => venta.anio == bestYear
    );
    // Ordenar los datos por mes
    const dataMEJOR_ANIO = new Array(12).fill(0);
    ventasMensualesMejorAnio.forEach((venta) => {
      dataMEJOR_ANIO[venta.mes - 1] = parseFloat(venta.total_mensual);
    });
    //----------------------------------------------------------------
    //DIVISION----------------------------------------------------------------
    //----------------------------------------------------------------
    let ventasxAnio = await Venta.findAll({
      attributes: [
        [fn("YEAR", col("fecha_venta")), "anio"],
        [fn("MONTH", col("fecha_venta")), "mes"],
        [
          fn("SUM", col("detalle_ventaMembresia.tarifa_monto")),
          "total_mensual",
        ],
      ],
      where: {
        fecha_venta: {
          [Op.between]: [
            new Date(new Date(rangoDate[1]).getFullYear(), 0, 1),
            new Date(new Date(rangoDate[1]).getFullYear(), 11, 31),
          ], // Suponiendo que fecha_inicial y fecha_final son variables con las fechas deseadas
        },
        flag: true,
      },
      include: [
        {
          model: detalleVenta_membresias,
          attributes: [],
          where: {
            id_pgm: id_programa,
          },
        },
      ],
      group: [fn("YEAR", col("fecha_venta")), fn("MONTH", col("fecha_venta"))],
      raw: true,
    });
    if (ventasxAnio.length <= 0) {
      ventasxAnio = [
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 1,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 2,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 3,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 4,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 5,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 6,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 7,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 8,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 9,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 10,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 11,
          total_mensual: 0,
        },
        {
          anio: new Date(rangoDate[1]).getFullYear(),
          mes: 12,
          total_mensual: 0,
        },
      ];
    }
    // Paso 2: Seleccionar el año con el mayor total de ventas
    const ventasAnual = ventasxAnio.reduce((acc, venta) => {
      const { anio, total_mensual } = venta;
      acc[anio] = (acc[anio] || 0) + parseFloat(total_mensual);
      return acc;
    }, {});
    const Year_v = Object.keys(ventasAnual).reduce((a, b) =>
      ventasAnual[a] > ventasAnual[b] ? a : b
    );

    // Paso 3: Obtener las ventas mensuales para el mejor año
    const ventasMensuales = ventasxAnio.filter((venta) => venta.anio == Year_v);

    // Ordenar los datos por mes
    const data_mensual = new Array(12).fill(0);
    ventasMensuales.forEach((venta) => {
      data_mensual[venta.mes - 1] = parseFloat(venta.total_mensual);
    });

    res.status(200).json({
      msg: "sucess",
      series: [
        {
          name: `Mejor Año: ${bestYear}`,
          data: dataMEJOR_ANIO,
        },
        {
          name: `Año: ${Year_v}`,
          data: data_mensual,
        },
      ],
    });
  } catch (error) {
    console.log(error);
    res.status(505).json({
      error: error,
    });
  }
};
const getReporteVentasPrograma_EstadoCliente = async (
  req = request,
  res = response
) => {
  // const { dateRanges, id_programa } = req.query;
  // const id_programa = 2;
  // const dateRanges = ["2024-05-01 00:00:00", "2024-11-01 00:00:00"];
  try {
    // const nuevos = await Venta.findAll({
    //   attributes: ["id_cli"],
    //   include: [
    //     {
    //       model: detalleVenta_membresias,
    //       attributes: [],
    //       where: {
    //         fec_inicio_mem: {
    //           [Op.between]: [dateRanges[0], dateRanges[1]],
    //         },
    //         id_pgm: id_programa,
    //       },
    //     },
    //   ],
    //   where: {
    //     fecha_venta: {
    //       [Op.between]: [dateRanges[0], dateRanges[1]],
    //     },
    //     id_cli: {
    //       [Op.notIn]: literal(`(
    //                     SELECT v2.id_cli
    //                     FROM tb_venta v2
    //                     JOIN detalle_ventaMembresia dm2 ON v2.id = dm2.id_venta
    //                     WHERE CONVERT(datetime, v2.fecha_venta, 20) < '${dateRanges[0]}' -- Ajusta el formato de fecha según sea necesario
    //                 )`),
    //     },
    //   },
    //   group: ["tb_venta.id", "id_cli"],
    // });

    // const nuevos = await db.query(
    //   `
    //   SELECT DISTINCT v.id_cli
    //         FROM tb_venta v
    //         LEFT JOIN detalle_ventaMembresia dm ON v.id = dm.id_venta
    //         WHERE v.fecha_venta BETWEEN :fecha_inicio AND :fecha_fin
    //         AND dm.id_pgm = :programa
    //         AND NOT EXISTS (
    //             SELECT 1
    //             FROM tb_venta v2
    //             INNER JOIN detalle_ventaMembresia dm2 ON v2.id = dm2.id_venta
    //             WHERE v.id_cli = v2.id_cli
    //             AND dm2.fec_fin_mem > GETDATE()
    //         )
    //   `,
    //   {
    //     replacements: {
    //       fecha_inicio: dateRanges[0],
    //       fecha_fin: dateRanges[1],
    //       programa: id_programa,
    //     },
    //     type: QueryTypes.SELECT,
    //   }
    // );
    // const reinscritos = await db.query(
    //   `
    //   SELECT DISTINCT v.id_cli
    //   FROM tb_venta v
    //   INNER JOIN detalle_ventaMembresia dm ON v.id = dm.id_venta
    //   WHERE v.fecha_venta BETWEEN :fecha_inicio AND :fecha_fin and dm.id_pgm = :programa
    //   AND EXISTS (
    //     SELECT 1
    //     FROM tb_venta v2
    //     INNER JOIN detalle_ventaMembresia dm2 ON v2.id = dm2.id_venta
    //     WHERE v.id_cli = v2.id_cli
    //     AND dm2.fec_fin_mem <= GETDATE() -- Verifica que la membresía anterior haya expirado
    //   )
    //   `,
    //   {
    //     replacements: {
    //       fecha_inicio: dateRanges[0],
    //       fecha_fin: dateRanges[1],
    //       programa: id_programa,
    //     },
    //     type: QueryTypes.SELECT,
    //   }
    // );
    // const renovados = await db.query(
    //   `

    //   `,
    //   {
    //     replacements: {
    //       fecha_inicio: dateRanges[0],
    //       fecha_fin: dateRanges[1],
    //       programa: id_programa,
    //     },
    //     type: QueryTypes.SELECT,
    //   }
    // );
    // Mapear los resultados para obtener solo los valores de id_cli
    // const ids = result.map((row) => row.id_cli);
    // console.log(ids);
    // const nuevos = await Venta.findAll({
    //   attributes: [
    //     [Sequelize.fn("DISTINCT", Sequelize.col("id_cli")), "id_cli"],
    //   ],
    //   include: [
    //     {
    //       model: detalleVenta_membresias,
    //       required: false,
    //       where: {
    //         fec_fin_mem: {
    //           [Op.gt]: Sequelize.literal("GETDATE()"),
    //         },
    //       },
    //       attributes: [],
    //     },
    //   ],
    //   where: {
    //     fecha_venta: {
    //       [Op.between]: [dateRanges[0], dateRanges[1]],
    //     },
    //   },
    //   group: ["id_cli"], // Agrupa por id_cli para lograr el efecto de DISTINCT
    // });

    // const reinscritos = await Venta.findAll({
    //   attributes: ["id_cli"],
    //   include: [
    //     {
    //       model: detalleVenta_membresias,
    //       attributes: [],
    //       where: {
    //         fec_inicio_mem: {
    //           [Op.between]: [dateRanges[0], dateRanges[1]],
    //         },
    //         id_pgm: id_programa,
    //       },
    //     },
    //   ],
    //   where: {
    //     fecha_venta: {
    //       [Op.between]: [dateRanges[0], dateRanges[1]],
    //     },
    //     [Op.and]: literal(`EXISTS (
    //           SELECT 1
    //           FROM tb_venta v2
    //           JOIN detalle_ventaMembresia dm2 ON v2.id = dm2.id_venta
    //           WHERE v2.id_cli = tb_venta.id_cli
    //           AND dm2.fec_fin_mem < detalle_ventaMembresia.fec_inicio_mem
    //       )`),
    //   },
    //   group: ["tb_venta.id", "id_cli"],
    // });
    // const renovados = await Venta.findAll({
    //   attributes: ["id_cli"],
    //   include: [
    //     {
    //       model: detalleVenta_membresias, // Asegúrate de usar el nombre correcto del modelo
    //       attributes: [],
    //       where: {
    //         fec_inicio_mem: {
    //           [Op.between]: [dateRanges[0], dateRanges[1]],
    //         },
    //         id_pgm: id_programa,
    //       },
    //       include: [
    //         {
    //           model: ExtensionMembresia,
    //           attributes: [],
    //         },
    //       ],
    //     },
    //   ],
    //   where: {
    //     fecha_venta: {
    //       [Op.between]: [dateRanges[0], dateRanges[1]],
    //     },
    //     [Op.and]: literal(`EXISTS (
    //           SELECT 1
    //           FROM tb_venta v2
    //           JOIN detalle_ventaMembresia dm2 ON v2.id = dm2.id_venta
    //           JOIN tb_extension_membresia em ON dm2.id_venta = em.id_venta
    //           WHERE v2.id_cli = tb_venta.id_cli
    //           AND DATEADD(DAY, CAST(em.dias_habiles AS INT), dm2.fec_fin_mem) >= detalle_ventaMembresia.fec_inicio_mem
    //       )`),
    //   },
    //   group: ["tb_venta.id", "id_cli"],
    // });
    // console.log(
    //   {
    //     nuevos: nuevos.map((n) => n.id_cli),
    //     reinscritos: reinscritos.map((r) => r.id_cli),
    //     renovados: renovados.map((rv) => rv.id_cli),
    //   },
    //   new Date(dateRanges[0]),
    //   "aquiiiiii"
    // );

    //*METODO DEFINITIVO
    //*---EXTRAER LA BASE DE DATOS -----

    const id_programa = 2;
    const dateRanges = ["2024-01-01 00:00:00", "2024-11-01 00:00:00"];
    let ventas_Programas_x_Cliente = await Venta.findAll({
      attributes: ["id_cli", "fecha_venta"],
      order: [["fecha_venta", "ASC"]],
      where: { flag: true },
      include: [
        {
          model: detalleVenta_membresias,
          attributes: ["fec_inicio_mem", "fec_fin_mem"],
          where: {
            id_pgm: id_programa,
          },
        },
      ],
      group: [
        "tb_venta.id",
        "tb_venta.fecha_venta",
        "tb_venta.id_cli",
        "detalle_ventaMembresia.id",
        "detalle_ventaMembresia.fec_inicio_mem",
        "detalle_ventaMembresia.fec_fin_mem",
      ],
      raw: true,
    });
    const groupByClientId = (data) => {
      const grouped = {};
      data.forEach((item) => {
        const { id_cli, fecha_venta } = item;
        if (!(id_cli in grouped)) {
          grouped[id_cli] = { id_cli, fecha_venta, membresias: [] };
        }
        grouped[id_cli].membresias.push({
          fec_inicio_mem: item["detalle_ventaMembresia.fec_inicio_mem"],
          fec_fin_mem: item["detalle_ventaMembresia.fec_fin_mem"],
        });
      });
      return Object.values(grouped);
    };

    // Función para filtrar por fechas
    function filtrarPorFechaVenta(ventas, fechaInicio, fechaFin) {
      return ventas.filter((venta) => {
        const fechaVenta = new Date(venta.fecha_venta);
        return fechaVenta >= fechaInicio && fechaVenta <= fechaFin;
      });
    }
    const fechaInicioFiltro = new Date("2024-05-01");
    const fechaFinFiltro = new Date("2024-12-31");

    res.status(200).json({
      msg: "success",
      ventas: filtrarPorFechaVenta(
        groupByClientId(ventas_Programas_x_Cliente),
        fechaInicioFiltro,
        fechaFinFiltro
      ),
      // ventas_Programas_x_Cliente: filtrarPorFechas(
      //   groupByClientId(ventas_Programas_x_Cliente),
      //   dateRanges[0],
      //   dateRanges[1]
      // ),
    });
  } catch (error) {
    console.log(error);
    res.status(505).json({
      error: error,
    });
  }
};
const getReporteDeVentasTickets = async (req = request, res = response) => {
  // const { fecha_venta } = req.query;
  const { id_programa, dateRanges } = req.query;
  try {
    if (id_programa == 0) {
      const datamembresias = await detalleVenta_membresias.findAll({
        attributes: ["id_pgm", "tarifa_monto", "id_st"],
        where: {
          flag: true,
        },
        order: [["id", "DESC"]],
        include: [
          {
            model: SemanasTraining,
            attributes: ["semanas_st"],
          },
          {
            model: Venta,
            attributes: ["id_cli", "fecha_venta"],
            where: {
              fecha_venta: {
                [Op.between]: [
                  new Date(dateRanges[0]),
                  new Date(dateRanges[1]),
                ], // Suponiendo que fecha_inicial y fecha_final son variables con las fechas deseadas
              },
              id_tipoFactura: {
                [Op.ne]: 701, // Excluye los registros con id_tipoFactura igual a 84
              },
            },
            required: true,
          },
        ],
        required: true,
        raw: true,
      });

      let sumTarifa = datamembresias.reduce(
        (total, objeto) => total + objeto.tarifa_monto,
        0
      );
      let sumSemanas = datamembresias.reduce(
        (total, objeto) => total + objeto["tb_semana_training.semanas_st"],
        0
      );

      res.status(200).json({
        data: {
          ventas_acumuladas: sumTarifa,
          ticket_medio: (sumTarifa / datamembresias.length).toFixed(2),
          cantidad_contratos: datamembresias.length,
          semanas_vendidas_programa: sumSemanas,
          ticket_prom_semanas: (sumTarifa / sumSemanas).toFixed(2),
        },
      });
    } else {
      const datamembresias = await detalleVenta_membresias.findAll({
        attributes: ["id_pgm", "tarifa_monto", "id_st"],
        where: {
          id_pgm: id_programa,
          flag: true,
        },
        order: [["id", "DESC"]],
        include: [
          {
            model: SemanasTraining,
            attributes: ["semanas_st"],
          },
          {
            model: Venta,
            attributes: ["id_cli", "fecha_venta"],
            where: {
              fecha_venta: {
                [Op.between]: [
                  new Date(dateRanges[0]),
                  new Date(dateRanges[1]),
                ], // Suponiendo que fecha_inicial y fecha_final son variables con las fechas deseadas
              },
              id_tipoFactura: {
                [Op.ne]: 701, // Excluye los registros con id_tipoFactura igual a 84
              },
            },
            required: true,
          },
        ],
        required: true,
        raw: true,
      });

      let sumTarifa = datamembresias.reduce(
        (total, objeto) => total + objeto.tarifa_monto,
        0
      );
      let sumSemanas = datamembresias.reduce(
        (total, objeto) => total + objeto["tb_semana_training.semanas_st"],
        0
      );

      res.status(200).json({
        data: {
          ventas_acumuladas: sumTarifa,
          ticket_medio: (sumTarifa / datamembresias.length).toFixed(2),
          cantidad_contratos: datamembresias.length - 1,
          semanas_vendidas_programa: sumSemanas,
          ticket_prom_semanas: (sumTarifa / sumSemanas).toFixed(2),
        },
      });
    }
  } catch (error) {
    console.log(error);
    res.status(505).json({
      error: error,
    });
  }
};
const getReporteDeClientesFrecuentes = async (req, res) => {
  try {
    // const { id_programa, dateRanges } = req.query;
    const dateRanges = ["2024-01-01 00:00:00", "2024-11-01 00:00:00"];
    const id_programa = 2;
    let datamembresia = await detalleVenta_membresias.findAll({
      attributes: ["id_pgm", "id_st", "horario"],
      where: {
        id_pgm: id_programa,
      },
      include: [
        {
          model: Venta,
          attributes: ["id_cli", "id_empl"],
          where: {
            fecha_venta: {
              [Op.between]: [new Date(dateRanges[0]), new Date(dateRanges[1])], // Suponiendo que fecha_inicial y fecha_final son variables con las fechas deseadas
            },
          },
          include: [
            {
              model: Cliente,
              attributes: [
                [
                  Sequelize.literal(
                    "CONCAT(nombre_cli, ' ', apPaterno_cli, ' ', apMaterno_cli)"
                  ),
                  "nombres_apellidos_clientes",
                ],
              ],
            },
          ],
        },
      ],
      raw: true,
    });
    datamembresia = datamembresia.reduce((acc, item) => {
      const key = item["tb_ventum.id_cli"];
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
    res.status(200).json({
      data: datamembresia,
    });
  } catch (error) {
    console.log(error);
    res.status(505).json({
      error: error,
    });
  }
};
const getReporteDeProgramasXsemanas = async (req = request, res = response) => {
  const { id_programa, dateRanges } = req.query;

  try {
    if (id_programa == 0) {
      let dataSemanas = await detalleVenta_membresias.findAll({
        attributes: ["id_pgm", "id_st", "tarifa_monto"],
        include: [
          {
            model: SemanasTraining,
            where: { flag: true, estado_st: true },
            attributes: ["semanas_st"],
          },
          {
            model: Venta,
            attributes: ["id_cli", "fecha_venta"],
            where: {
              fecha_venta: {
                [Op.between]: [
                  new Date(dateRanges[0]),
                  new Date(dateRanges[1]),
                ],
              },
            },
          },
        ],
        raw: true,
      });
      dataSemanas = Object.values(
        dataSemanas.reduce((acc, item) => {
          const { id_st } = item;
          if (!acc[id_st]) {
            acc[id_st] = {
              id_st,
              semana: item["tb_semana_training.semanas_st"],
              items: [],
            };
          }
          acc[id_st].items.push(item);
          return acc;
        }, {})
      );

      res.status(200).json({
        data: dataSemanas,
      });
    } else {
      let dataSemanas = await detalleVenta_membresias.findAll({
        attributes: ["id_pgm", "id_st", "tarifa_monto"],
        where: {
          id_pgm: id_programa,
        },
        include: [
          {
            model: SemanasTraining,
            where: { flag: true, estado_st: true },
            attributes: ["semanas_st"],
          },
          {
            model: Venta,
            attributes: ["id_cli", "fecha_venta"],
            where: {
              fecha_venta: {
                [Op.between]: [
                  new Date(dateRanges[0]),
                  new Date(dateRanges[1]),
                ],
              },
            },
          },
        ],
        raw: true,
      });
      dataSemanas = Object.values(
        dataSemanas.reduce((acc, item) => {
          const { id_st } = item;
          if (!acc[id_st]) {
            acc[id_st] = {
              id_st,
              semana: item["tb_semana_training.semanas_st"],
              items: [],
            };
          }
          acc[id_st].items.push(item);
          return acc;
        }, {})
      );

      res.status(200).json({
        data: dataSemanas,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(505).json({
      error: error,
    });
  }
};
const getReporteDeEgresos = async (req = request, res = response) => {
  // console.log(req.query, "hola");
  const { arrayDate } = req.query;
  const fechaInicio = arrayDate[0];
  const fechaFin = arrayDate[1];
  console.log(
    dayjs(fechaInicio).format("YYYY-MM-DD"),
    dayjs(fechaFin).format("YYYY-MM-DD")
  );

  try {
    const gastos = await Gastos.findAll({
      where: {
        flag: true,
        [Sequelize.Op.and]: Sequelize.where(
          Sequelize.fn("YEAR", Sequelize.col("fec_comprobante")),
          "<",
          2030
        ),
        id: {
          [Sequelize.Op.not]: 2548,
        },
        fec_comprobante: {
          [Op.between]: [
            dayjs(fechaInicio).format("YYYY-MM-DD"),
            dayjs(fechaFin).format("YYYY-MM-DD"),
          ],
        },
      },
      order: [["fec_pago", "desc"]],
      attributes: [
        "id",
        "moneda",
        "monto",
        "fec_pago",
        "id_tipo_comprobante",
        "n_comprabante",
        "impuesto_igv",
        "impuesto_renta",
        "n_operacion",
        "fec_registro",
        "fec_comprobante",
        "descripcion",
        "id_prov",
      ],
      include: [
        {
          model: Proveedor,
          attributes: ["razon_social_prov"],
        },
        {
          model: ParametroGastos,
          attributes: [
            "id",
            "id_empresa",
            "nombre_gasto",
            "grupo",
            "id_tipoGasto",
          ],
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_banco",
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_forma_pago",
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_comprobante",
        },
      ],
    });

    res.status(200).json({
      reporte: gastos,
    });
  } catch (error) {
    console.log(error);
    res.status(505).json({
      error: error,
    });
  }
};
const getReporteDeUtilidadesTotal = async (req = request, res = response) => {
  const { arrayDate } = req.query;
  const fechaInicio = arrayDate[0];
  const fechaFin = arrayDate[1];
  try {
    let gastosTarata = await Gastos.findAll({
      where: {
        flag: true,
        [Sequelize.Op.and]: Sequelize.where(
          Sequelize.fn("YEAR", Sequelize.col("fec_pago")),
          "<",
          2030
        ),
        id: {
          [Sequelize.Op.not]: 2548,
        },
        fec_pago: {
          [Sequelize.Op.between]: [new Date(fechaInicio), new Date(fechaFin)],
        },
      },
      order: [["fec_pago", "asc"]],
      attributes: ["id", "fec_pago", "moneda", "monto"],
      include: [
        {
          model: ParametroGastos,
          where: { grupo: "TARATA" },
          attributes: ["nombre_gasto", "grupo", "id_tipoGasto"],
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_banco",
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_forma_pago",
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_comprobante",
        },
      ],
    });
    let gastosReducto = await Gastos.findAll({
      where: {
        flag: true,
        [Sequelize.Op.and]: Sequelize.where(
          Sequelize.fn("YEAR", Sequelize.col("fec_pago")),
          "<",
          2030
        ),
        id: {
          [Sequelize.Op.not]: 2548,
        },
        fec_pago: {
          [Sequelize.Op.between]: [new Date(fechaInicio), new Date(fechaFin)],
        },
      },
      order: [["fec_pago", "asc"]],
      attributes: ["id", "fec_pago", "moneda", "monto"],
      include: [
        {
          model: ParametroGastos,
          where: { grupo: "REDUCTO" },
          attributes: ["nombre_gasto", "grupo", "id_tipoGasto"],
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_banco",
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_forma_pago",
        },
        {
          model: Parametros,
          attributes: ["id_param", "label_param"],
          as: "parametro_comprobante",
        },
      ],
    });
    let aportes = await Aporte.findAll({
      attributes: ["fecha_aporte", "monto_aporte"],
      where: {
        fecha_aporte: {
          [Sequelize.Op.between]: [new Date(fechaInicio), new Date(fechaFin)],
        },
      },
    });
    let ventas = await Venta.findAll({
      attributes: ["id", "fecha_venta"],
      order: [["id", "DESC"]],
      where: {
        fecha_venta: {
          [Sequelize.Op.between]: [new Date(fechaInicio), new Date(fechaFin)],
        },
      },
      include: [
        {
          model: detalleVenta_producto,
          attributes: [
            "id_venta",
            "id_producto",
            "cantidad",
            "precio_unitario",
            "tarifa_monto",
          ],
        },
        {
          model: detalleVenta_membresias,
          attributes: [
            "id_venta",
            "id_pgm",
            "id_tarifa",
            "horario",
            "id_st",
            "tarifa_monto",
          ],
        },
        {
          model: detalleVenta_citas,
          attributes: ["id_venta", "id_servicio", "tarifa_monto"],
          include: [
            {
              model: Servicios,
              attributes: ["id", "nombre_servicio"],
            },
          ],
        },
      ],
    });

    res.status(200).json({
      msg: "success",
      ventas,
      gastosTarata,
      gastosReducto,
      aportes,
    });
  } catch (error) {
    console.log(error);
    res.status(505).json({
      error: error,
    });
  }
};
const getReporteDeTotalDeVentas_ClientesVendedores = async (
  req = request,
  res = response
) => {
  const { arrayDate } = req.query;
  console.log(arrayDate);

  const fechaInicio = arrayDate[0];
  const fechaFin = arrayDate[1];

  try {
    const TotalventasPorClientesYVendedores = await Venta.findAll({
      where: {
        flag: true,
        fecha_venta: {
          [Sequelize.Op.between]: [new Date(fechaInicio), new Date(fechaFin)],
        },
      },
      order: [["fecha_venta", "desc"]],
      attributes: ["id", "id_cli", "id_empl"],
      include: [
        {
          model: Cliente,
          attributes: [
            "id_cli",
            [
              Sequelize.literal(
                "CONCAT(nombre_cli, ' ', apPaterno_cli, ' ', apMaterno_cli)"
              ),
              "nombres_apellidos_clientes",
            ],
            "tipoCli_cli",
          ],
        },
        {
          model: Empleado,
          attributes: [
            "id_empl",
            [
              Sequelize.literal(
                "CONCAT(nombre_empl, ' ', apPaterno_empl, ' ', apMaterno_empl)"
              ),
              "nombres_apellidos_clientes",
            ],
          ],
        },
      ],
    });
    res.status(200).json({
      reporte: TotalventasPorClientesYVendedores,
    });
  } catch (error) {
    console.log(error);
    res.status(505).json({
      error: error,
    });
  }
};
const getReporteVentas = async (req = request, res = response) => {
  const { arrayDate } = req.query;

  const fechaInicio = arrayDate[0];
  const fechaFin = arrayDate[1];
  try {
    const ventas = await Venta.findAll({
      attributes: [
        "id",
        "id_cli",
        "id_empl",
        "id_tipoFactura",
        "numero_transac",
        "fecha_venta",
      ],
      where: {
        fecha_venta: {
          [Op.between]: [
            new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
            new Date(fechaFin).setUTCHours(23, 59, 59, 999),
          ],
        },
        id_tipoFactura: {
          [Op.ne]: 701, // Excluye los registros con id_tipoFactura igual a 84
        },
      },
      order: [["id", "DESC"]],
      include: [
        {
          model: Cliente,
          attributes: [
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
            "estCivil_cli",
            "sexo_cli",
            "ubigeo_distrito_cli",
            "nacionalidad_cli",
            "tipoCli_cli",
            "fecNac_cli",
            "fecha_nacimiento",
            "createdAt",
          ],
          include: [
            {
              model: Distritos,
              attributes: ["distrito"],
              as: "ubigeo_nac",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_estCivil",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_tipocli",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_sexo",
            },
          ],
        },
        {
          model: Empleado,
          attributes: [
            [
              Sequelize.fn(
                "CONCAT",
                Sequelize.col("nombre_empl"),
                " ",
                Sequelize.col("apPaterno_empl"),
                " ",
                Sequelize.col("apMaterno_empl")
              ),
              "nombres_apellidos_empl",
            ],
          ],
          include: [
            {
              model: ImagePT,
            },
          ],
        },
        {
          model: detalleVenta_producto,
          attributes: [
            "id_venta",
            "id_producto",
            "cantidad",
            "precio_unitario",
            "tarifa_monto",
          ],
          include: [
            {
              model: Producto,
              attributes: ["id", "id_categoria"],
            },
          ],
        },
        {
          model: detalleVenta_membresias,
          attributes: [
            "id_venta",
            "id_pgm",
            "id_tarifa",
            "horario",
            "id_st",
            "tarifa_monto",
          ],

          include: [
            {
              model: ProgramaTraining,
              attributes: ["name_pgm", "id_pgm"],
              include: [
                {
                  model: ImagePT,
                  attributes: ["name_image", "width", "height", "id"],
                },
              ],
            },
            {
              model: SemanasTraining,
              attributes: ["semanas_st", "id_st"],
            },
          ],
        },
        {
          model: detalleVenta_citas,
          attributes: ["id_venta", "id_servicio", "tarifa_monto"],
          include: [
            {
              model: Servicios,
              attributes: ["id", "tipo_servicio"],
            },
          ],
        },
        {
          model: detalleVenta_pagoVenta,
          attributes: ["id_venta", "parcial_monto"],
          include: [
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_banco",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_forma_pago",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_tipo_tarjeta",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_tarjeta",
            },
          ],
        },
      ],
    });
    res.status(200).json({
      ok: true,
      reporte: ventas,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de get_VENTAS, hable con el administrador: ${error}`,
    });
  }
};
const getReporteFormasDePago = async (req = request, res = response) => {
  const { arrayDate } = req.query;
  const fechaInicio = arrayDate[0];
  const fechaFin = arrayDate[1];
  try {
    const ventasxFormasPago = await Venta.findAll({
      attributes: [
        "id",
        "id_cli",
        "id_empl",
        "id_tipoFactura",
        "numero_transac",
        "fecha_venta",
      ],
      where: {
        fecha_venta: {
          [Sequelize.Op.between]: [new Date(fechaInicio), new Date(fechaFin)],
        },
      },
      order: [["id", "DESC"]],
      include: [
        {
          model: detalleVenta_pagoVenta,
          attributes: [
            "fecha_pago",
            "id_forma_pago",
            "id_tipo_tarjeta",
            "id_tarjeta",
            "id_banco",
            "parcial_monto",
            "n_operacion",
            "observacion",
          ],
          include: [
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_banco",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_forma_pago",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_tipo_tarjeta",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_tarjeta",
            },
          ],
        },
      ],
    });

    res.status(200).json({
      ok: true,
      reporte: ventasxFormasPago,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de get_VENTAS, hable con el administrador: ${error}`,
    });
  }
};
const getReporteDeMembresiasxFechaxPrograma = async (
  req = request,
  res = response
) => {
  const { rangoDate } = req.query;
  const fechaInicio = rangoDate[0];
  const fechaFin = rangoDate[1];
  try {
    const {} = await res.status(200).json({
      ok: true,
      reporte: ventas,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de get_VENTAS, hable con el administrador: ${error}`,
    });
  }
};
const obtenerReporteSociosxDistritos = async (
  req = request,
  res = response
) => {
  const { id_pgm } = req.params;
  const { arrayDate } = req.query;
  const dateRanges = ["2024-10-01 00:00:00", "2024-11-01 00:00:00"];
  const fechaInicio = arrayDate[0];
  const fechaFin = arrayDate[1];
  try {
    // let membresias = await detalleVenta_membresias.findAll({
    //   attributes: ["id", "fec_inicio_mem", "horario", "fec_fin_mem"],
    //   order: [["id", "DESC"]],
    //   include: [
    //     {
    //       model: ExtensionMembresia,
    //       attributes: [
    //         "tipo_extension",
    //         "extension_inicio",
    //         "extension_fin",
    //         "dias_habiles",
    //       ],
    //     },
    //     {
    //       model: Venta,
    //       attributes: ["id", "fecha_venta"],
    //       required: true,
    //       fecha_venta: {
    //         [Sequelize.Op.between]: [new Date(fechaInicio), new Date(fechaFin)],
    //       },
    //       include: [
    //         {
    //           model: Cliente,
    //           attributes: [
    //             "id_cli",
    //             [
    //               Sequelize.fn(
    //                 "CONCAT",
    //                 Sequelize.col("nombre_cli"),
    //                 " ",
    //                 Sequelize.col("apPaterno_cli"),
    //                 " ",
    //                 Sequelize.col("apMaterno_cli")
    //               ),
    //               "nombres_apellidos_cli",
    //             ],
    //             "email_cli",
    //             "tel_cli",
    //             "ubigeo_distrito_cli",
    //           ],
    //         },
    //       ],
    //     },
    //     {
    //       model: ProgramaTraining,
    //       attributes: ["id_pgm", "name_pgm"],
    //       where: { estado_pgm: true, flag: true, id_pgm: id_pgm },
    //     },
    //     {
    //       model: SemanasTraining,
    //       attributes: ["id_st", "semanas_st"],
    //     },
    //   ],
    // });
    if (id_pgm == 0) {
      const ventasMembresias = await Venta.findAll({
        where: {
          flag: true,
          fecha_venta: {
            [Sequelize.Op.between]: [new Date(fechaInicio), new Date(fechaFin)],
          },
        },
        attributes: ["id_tipoFactura"],
        order: [["fecha_venta", "DESC"]],
        include: [
          {
            model: Cliente,
            attributes: [
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
              "ubigeo_distrito_cli",
            ],
            include: [
              {
                model: Distritos,
                attributes: ["distrito"],
              },
            ],
          },
          // {
          //   model: Empleado,
          //   attributes: [
          //     [
          //       Sequelize.fn(
          //         "CONCAT",
          //         Sequelize.col("nombre_empl"),
          //         " ",
          //         Sequelize.col("apPaterno_empl"),
          //         " ",
          //         Sequelize.col("apMaterno_empl")
          //       ),
          //       "nombres_apellidos_empl",
          //     ],
          //   ],
          // },
          {
            model: detalleVenta_membresias,
            required: true,
            attributes: ["horario", "id_st", "tarifa_monto"],
            include: [
              {
                model: ProgramaTraining,
                attributes: ["id_pgm", "name_pgm"],
              },
              {
                model: SemanasTraining,
                attributes: ["id_st", "semanas_st", "sesiones"],
              },
            ],
          },
        ],
      });
      res.status(200).json({
        ok: true,
        ventas: [...ventasMembresias],
      });
    } else {
      const ventasMembresias = await Venta.findAll({
        where: {
          flag: true,
          fecha_venta: {
            [Sequelize.Op.between]: [new Date(fechaInicio), new Date(fechaFin)],
          },
        },
        attributes: ["id_tipoFactura"],
        order: [["fecha_venta", "DESC"]],
        include: [
          {
            model: Cliente,
            attributes: [
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
              "ubigeo_distrito_cli",
            ],
            include: [
              {
                model: Distritos,
                attributes: ["distrito"],
              },
            ],
          },
          // {
          //   model: Empleado,
          //   attributes: [
          //     [
          //       Sequelize.fn(
          //         "CONCAT",
          //         Sequelize.col("nombre_empl"),
          //         " ",
          //         Sequelize.col("apPaterno_empl"),
          //         " ",
          //         Sequelize.col("apMaterno_empl")
          //       ),
          //       "nombres_apellidos_empl",
          //     ],
          //   ],
          // },
          {
            model: detalleVenta_membresias,
            where: {
              id_pgm: id_pgm,
            },
            required: true,
            attributes: ["horario", "id_st", "tarifa_monto"],
            include: [
              {
                model: ProgramaTraining,
                attributes: ["id_pgm", "name_pgm"],
              },
              {
                model: SemanasTraining,
                attributes: ["id_st", "semanas_st", "sesiones"],
              },
            ],
          },
        ],
      });
      res.status(200).json({
        ok: true,
        ventas: [...ventasMembresias],
      });
    }
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de obtenerReporteSociosxDistritos, hable con el administrador: ${error}`,
    });
  }
};
const obtenerTraspaso = async (req = request, res = response) => {};
const obtenerTransferencias = async (req = request, res = response) => {
  try {
    const { id_pgm } = req.params;
    const { arrayDate } = req.query;
    const dateRanges = ["2024-10-01 00:00:00", "2024-11-01 00:00:00"];
    const fechaInicio = dateRanges[0];
    const fechaFin = dateRanges[1];
    if (id_pgm == 0) {
      const transferenciasMembresias = await detalleVenta_Transferencia.findAll(
        {
          order: [["id", "DESC"]],
          raw: true,
          include: [
            {
              model: Venta,
              where: {
                fecha_venta: {
                  [Sequelize.Op.between]: [
                    new Date(fechaInicio),
                    new Date(fechaFin),
                  ],
                },
              },
              attributes: ["id", "fecha_venta"],
              as: "venta_venta",
            },
          ],
        }
      );
      res.status(200).json({
        ok: true,
        transferencias: [...transferenciasMembresias],
      });
    } else {
      let transferenciasMembresias = await detalleVenta_Transferencia.findAll({
        order: [["id", "DESC"]],
        raw: true,
        include: [
          {
            model: Venta,
            where: {
              fecha_venta: {
                [Sequelize.Op.between]: [
                  new Date(fechaInicio),
                  new Date(fechaFin),
                ],
              },
            },
            attributes: ["id", "fecha_venta"],
            as: "venta_venta",
            include: [
              {
                model: Cliente,
                attributes: [
                  "id_cli",
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
                  "email_cli",
                  "tel_cli",
                  "ubigeo_distrito_cli",
                ],
              },
              {
                model: detalleVenta_membresias,
                where: {
                  id_pgm: id_pgm,
                },
              },
            ],
          },
          {
            model: Venta,
            as: "venta_transferencia",
          },
        ],
      });
      res.status(200).json({
        ok: true,
        transferencias: [...transferenciasMembresias],
      });
    }
  } catch (error) {
    console.log(error);
    res.status(505).json({
      error: error,
    });
  }
};

module.exports = {
  obtenerTransferencias,
  getReporteSeguimiento,
  getReporteProgramas,
  getReporteVentasPrograma_COMPARATIVACONMEJORANO,
  getReporteVentasPrograma_EstadoCliente,
  getReporteDeVentasTickets,
  getReporteDeClientesFrecuentes,
  getReporteDeProgramasXsemanas,
  getReporteDeEgresos,
  getReporteDeUtilidadesTotal,
  getReporteDeTotalDeVentas_ClientesVendedores,
  getReporteVentas,
  getReporteFormasDePago,
  obtenerReporteSociosxDistritos,
  getReporteDeMembresiasxFechaxPrograma,
};

// Función para relacionar transferencias y ventas
const relacionarTransferencias = (transferencias, ventas) => {
  return ventas.map((venta) => {
    // Busca la transferencia correspondiente según el id de la venta (que debería coincidir con el id_membresia)
    const transferenciaRelacionada = transferencias.find((transf) => {
      // console.log(
      //   transf.id_membresia,
      //   Number(transf.id_membresia) === Number(venta.tb_ventum.id),
      //   venta.tb_ventum.id
      // );

      return Number(transf.id_membresia) === Number(venta.tb_ventum.id);
    });
    if (transferenciaRelacionada) {
      // Si hay una transferencia relacionada, reemplaza los datos en el objeto de venta
      return {
        ...venta, // Mantén los datos de venta
        tb_ventum: {
          tb_cliente: {
            id_cli: transferenciaRelacionada["venta_venta.tb_cliente.id_cli"],
            nombres_apellidos_cli:
              transferenciaRelacionada[
                "venta_venta.tb_cliente.nombres_apellidos_cli"
              ],
            email_cli:
              transferenciaRelacionada["venta_venta.tb_cliente.email_cli"],
            tel_cli: transferenciaRelacionada["venta_venta.tb_cliente.tel_cli"],
            ubigeo_distrito_cli:
              transferenciaRelacionada[
                "venta_venta.tb_cliente.ubigeo_distrito_cli"
              ],
            tb_distrito: {
              distrito:
                transferenciaRelacionada[
                  "venta_venta.tb_cliente.tb_distrito.distrito"
                ],
            },
          },
          // Puedes añadir más campos que desees reemplazar aquí
          fec_inicio_mem: transferenciaRelacionada.fec_inicio_mem,
          fec_fin_mem: transferenciaRelacionada.fec_fin_mem,
          fec_fin_mem_new: transferenciaRelacionada.fec_fin_mem,
          tb_ProgramaTraining: venta.tb_ProgramaTraining,
          tb_semana_training: venta.tb_semana_training,
        },
      };
    }

    return venta; // Si no hay match, devolver el objeto de venta original
  });
};
