const { response, request } = require("express");
const {
  Venta,
  detalleVenta_membresias,
  detalleVenta_Transferencia,
} = require("../models/Venta");
const { ExtensionMembresia } = require("../models/ExtensionMembresia");
const { Sequelize } = require("sequelize");
const { Cliente } = require("../models/Usuarios");
const { Distritos } = require("../models/Distritos");
const { ProgramaTraining, SemanasTraining } = require("../models/ProgramaTraining");
const { ImagePT } = require("../models/Image");

const getReporteSeguimientoClientes = async (req = request, res = response) => {
  const { id_empresa } = req.params;
  try {
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
    res.status(202).json({
      ok: true,
      membresias,
      transferenciasMembresias,
    });
  } catch (error) {
    res.status(404).json({
      ok: false,
    });
  }
};
module.exports = {
  getReporteSeguimientoClientes,
};
