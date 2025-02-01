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

const obtenerMembresiasxFecha = async (req = request, res = response) => {
  const { arrayDate } = req.query;
  const { id_enterprice } = req.params;

  const fechaInicio = arrayDate[0];
  const fechaFin = arrayDate[1];

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
                //   {
                //     model: Empleado,
                //   },
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
module.exports = {
  obtenerMembresiasxFecha,
};
