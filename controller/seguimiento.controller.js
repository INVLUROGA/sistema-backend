const { request, response } = require("express");
const { Seguimiento } = require("../models/Seguimientos");
const {
  detalleVenta_membresias,
  Venta,
  detalle_cambioPrograma,
} = require("../models/Venta");
const { Op } = require("sequelize");
const {
  ProgramaTraining,
  SemanasTraining,
} = require("../models/ProgramaTraining");
const { Cliente } = require("../models/Usuarios");
const { ImagePT } = require("../models/Image");
const { ExtensionMembresia } = require("../models/ExtensionMembresia");

const getSeguimientos = async (req = request, res = response) => {
  try {
    const dataSeguimiento = await Cliente.findAll({
      attributes: [
        "uid",
        "id_cli",
        "nombre_cli",
        "apPaterno_cli",
        "apMaterno_cli",
        "email_cli",
        "tel_cli",
      ],
      include: [
        {
          model: Seguimiento,
          as: "cli_seguimiento",
          where: {
            flag: true,
          },
          order: [["id", "asc"]],
          include: [
            {
              model: detalleVenta_membresias,
              attributes: [
                "tarifa_monto",
                "id_pgm",
                "id",
                "id_venta",
                "fecha_inicio",
                "horario",
              ],
              as: "venta",
              include: [
                {
                  model: detalle_cambioPrograma,
                  as: "cambio_programa",
                  include: [
                    {
                      model: ProgramaTraining,
                      as: "pgm",
                    },
                  ],
                },
                {
                  model: Venta,
                  attributes: ["id", "id_cli", "id_origen", "fecha_venta"],
                  required: true,
                  where: {
                    id_empresa: 598,
                  },
                },
                {
                  model: ProgramaTraining,
                  attributes: ["name_pgm"],
                },
                {
                  model: SemanasTraining,
                  attributes: ["semanas_st"],
                },
              ],
            },
          ],
        },
      ],
    });

    res.status(201).json({
      dataSeguimiento,
    });
    // const dataSeguimiento = await Seguimiento.findAll({
    //   where: {
    //     flag: true,
    //     fecha_vencimiento: {
    //       [Op.ne]: null, // 👈 no null
    //     },
    //   },
    //   order: [["id", "desc"]],
    //   include: [
    //     {
    //       model: Cliente,
    //       as: "cli",
    //     },
    //     {
    //       model: detalleVenta_membresias,
    //       attributes: ["tarifa_monto", "id_pgm", "id", "id_venta"],
    //       as: "venta",
    //       include: [
    //         {
    //           model: Venta,
    //           attributes: ["id", "id_cli", "id_origen", "fecha_venta"],
    //         },
    //       ],
    //     },
    //   ],
    // });
    // res.status(201).json({
    //   dataSeguimiento,
    // });
  } catch (error) {
    console.log(error);
  }
};
// Membresías de UN cliente (identificado por uid) tal como están en tb_seguimiento,
// que es la fuente que ya trae fecha_vencimiento ajustada por congelamientos/regalos
// (a diferencia de fec_fin_mem, que es la fecha original de la venta).
const obtenerSeguimientosxUid = async (req = request, res = response) => {
  const { uid } = req.params;
  try {
    // findAll (no findOne) a propósito: con findOne el LIMIT 1 implícito, combinado con
    // subQuery:false y el hasMany de abajo, recorta el join plano a una sola fila total y
    // se pierden seguimientos del mismo cliente (uid ya filtra a un único cliente igual).
    const [cliente] = await Cliente.findAll({
      where: { uid },
      attributes: ["id_cli", "uid", "nombre_cli", "apPaterno_cli", "apMaterno_cli"],
      // subQuery:false evita que Sequelize envuelva la consulta en una subconsulta de paginación,
      // que en SQL Server rompe los JOIN anidados de "venta" hacia adentro (columnas no ligables).
      subQuery: false,
      include: [
        {
          model: Seguimiento,
          as: "cli_seguimiento",
          where: {
            flag: true,
          },
          required: false,
          order: [["id", "desc"]],
          include: [
            {
              model: detalleVenta_membresias,
              attributes: [
                "id",
                "id_venta",
                "id_pgm",
                "tarifa_monto",
                "fecha_inicio",
                "fec_inicio_mem",
                "fec_fin_mem",
                "horario",
              ],
              as: "venta",
              include: [
                {
                  model: Venta,
                  attributes: ["id", "id_cli", "id_origen", "id_empresa", "fecha_venta"],
                  required: true,
                },
                {
                  model: ProgramaTraining,
                  attributes: ["id_pgm", "name_pgm"],
                  include: [
                    {
                      model: ImagePT,
                      attributes: ["id", "name_image", "width", "height"],
                    },
                  ],
                },
                {
                  model: SemanasTraining,
                  attributes: ["semanas_st", "nutricion_st", "congelamiento_st"],
                },
                {
                  model: detalle_cambioPrograma,
                  as: "cambio_programa",
                  include: [
                    {
                      model: ProgramaTraining,
                      as: "pgm",
                    },
                  ],
                },
                {
                  model: ExtensionMembresia,
                  attributes: [
                    "id",
                    "tipo_extension",
                    "extension_inicio",
                    "extension_fin",
                    "dias_habiles",
                    "observacion",
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    res.status(200).json({
      seguimientos: cliente?.cli_seguimiento || [],
    });
  } catch (error) {
    console.log(error);
    res.status(505).json({
      msg: `Problemas en obtenerSeguimientosxUid: ${error}`,
    });
  }
};
const getSeguimientoxFechaVencimientos = async (
  req = request,
  res = response,
) => {
  try {
    const { arrayDate } = req.query;
    const fecha_inicial = arrayDate[0];
    const fecha_final = arrayDate[1];
    const dataSeguimiento = await Seguimiento.findAll({
      where: {
        flag: true,
        fecha_vencimiento: {
          [Op.between]: [fecha_inicial, fecha_final],
        },
      },
      order: [["id", "desc"]],
      include: [
        {
          model: Cliente,
          as: "cli",
        },
        {
          model: detalleVenta_membresias,
          attributes: ["tarifa_monto", "id_pgm", "id", "id_venta"],
          as: "venta",
          include: [
            {
              model: Venta,
              attributes: ["id", "id_cli", "id_origen", "fecha_venta"],
            },
          ],
        },
      ],
    });
    res.status(201).json({
      dataSeguimiento,
    });
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  getSeguimientos,
  obtenerSeguimientosxUid,
  getSeguimientoxFechaVencimientos,
};
