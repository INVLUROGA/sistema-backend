const { request, response } = require("express");
const {
  ProgramaTraining,
  TarifaTraining,
  SemanasTraining,
} = require("../models/ProgramaTraining");
const {
  detalleVenta_membresias,
  Venta,
  detalleVenta_Transferencia,
} = require("../models/Venta");
const { Cliente, Empleado } = require("../models/Usuarios");
const { Distritos } = require("../models/Distritos");
const { ImagePT } = require("../models/Image");
const { Op, Sequelize } = require("sequelize");

const obtenerMembresiasxFecha = async (req = request, res = response) => {
  const { id_enterprice } = req.params;
  try {
    const ventasProgramas = await ProgramaTraining.findAll({
      attributes: ["name_pgm", "id_pgm"],
      where: { flag: true, estado_pgm: true },
      distinct: true,
      include: [
        {
          model: ImagePT,
          attributes: ["name_image", "height", "width"],
        },
        {
          model: detalleVenta_membresias,
          attributes: [
            "id_venta",
            "horario",
            "tarifa_monto",
            "id_tarifa",
            "fec_inicio_mem",
            "fec_fin_mem",
          ],
          required: true,
          include: [
            //   {
            //     model: TarifaTraining,
            //     attributes: [
            //       "nombreTarifa_tt",
            //       "descripcionTarifa_tt",
            //       "tarifaCash_tt",
            //     ],
            //     as: "tarifa_venta",
            //   },
            {
              model: SemanasTraining,
              attributes: ["sesiones"],
            },
            {
              model: Venta,
              where: {
                id_empresa: id_enterprice,
              },
              attributes: [
                "id_tipoFactura",
                "fecha_venta",
                "id_cli",
                "id",
                "id_origen",
              ],
              include: [
                {
                  model: Cliente,
                  include: [
                    {
                      model: Distritos,
                    },
                    // {
                    //   model: Marcacion,
                    //   required: false,
                    //   where: {
                    //     tiempo_marcacion_new: {
                    //       [Op.between]: [
                    //         new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
                    //         new Date(fechaFin).setUTCHours(23, 59, 59, 999),
                    //       ],
                    //     },
                    //   },
                    // },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    // console.log(ventasProgramas);

    res.status(200).json({
      vm: ventasProgramas,
      // ventasDeMembresias,
    });
  } catch (error) {
    console.log(error);
  }
};
const obtenerMembresiasVentas = async (req = request, res = response) => {
  const { id_empresa } = req.params;
  try {
    const ventas = await Venta.findAll({
      where: { flag: true, id_empresa: id_empresa },
      attributes: [
        "id",
        "id_cli",
        "id_empl",
        "id_origen",
        "id_tipoFactura",
        "numero_transac",
        "fecha_venta",
        "status_remove",
        "observacion",
      ],
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
                Sequelize.col("apMaterno_cli"),
              ),
              "nombres_apellidos_cli",
            ],
            "sexo_cli",
            "ubigeo_distrito_cli",
            "ubigeo_distrito_trabajo",
            "numDoc_cli",
            "tel_cli",
          ],
          include: [
            {
              model: ImagePT,
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
                Sequelize.col("apMaterno_empl"),
              ),
              "nombres_apellidos_empl",
            ],
          ],
        },
        {
          model: detalleVenta_Transferencia,
          as: "venta_venta",
          required: false, // Para que no excluya toda la venta si no tiene productos con flag=true
          attributes: ["id_venta", "tarifa_monto"],
        },
        {
          model: detalleVenta_membresias,
          required: false, // Para que no excluya toda la venta si no tiene productos con flag=true
          attributes: [
            "id",
            "id_venta",
            "id_pgm",
            "id_tarifa",
            "horario",
            "id_st",
            "tarifa_monto",
            "fecha_inicio",
            "id_membresia_anterior",
          ],
          include: [
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
    });
    res.status(200).json({
      ok: true,
      ventas,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: `Error en el servidor, en controller de get_VENTAS, hable con el administrador: ${error}`,
    });
  }
};
module.exports = {
  obtenerMembresiasxFecha,
  obtenerMembresiasVentas
};
