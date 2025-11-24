const { request, response } = require("express");
const { ContratoProv } = require("../models/ContratoProv.model");
const uid = require("uuid");
const { capturarAUDIT } = require("../middlewares/auditoria");
const { typesCRUD } = require("../types/types");
const { Proveedor } = require("../models/Proveedor");
const { ImagePT } = require("../models/Image");
const { Penalidad } = require("../models/Penalidad");
const { Parametros_zonas } = require("../models/Parametros");
const { Gastos } = require("../models/GastosFyV");
const { Sequelize } = require("sequelize");

// Crear ContratoProv
const PostContratoProv = async (req = request, res = response) => {
  try {
    // const { } = req.body;
    const contratoProv = new ContratoProv({
      uid_presupuesto: uid.v4(),
      uid_contrato: uid.v4(),
      uid_compromisoPago: uid.v4(),
      ...req.body,
    });
    await contratoProv.save();
    let formAUDIT = {
      id_user: req.id_user,
      ip_user: req.ip_user,
      accion: typesCRUD.POST,
      observacion: `Se registro: contrato del proveedor de id ${contratoProv.id}`,
      fecha_audit: new Date(),
    };
    await capturarAUDIT(formAUDIT);
    res.status(200).json({
      msg: "contrato del Proveedor creado con exito",
      contratoProv,
      ok: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema",
    });
  }
};

// Obtener todos los ContratoProvs
const GetContratoProvs = async (req = request, res = response) => {
  try {
    const { id_empresa } = req.params;
    const contratosProv = await ContratoProv.findAll({
      where: { flag: true, id_empresa },
      order: [["id", "desc"]],
      include: [
        {
          model: Proveedor,
          as: "prov",
        },
        {
          model: ImagePT,
          as: "contratoProv",
          attributes: ["name_image", "id"],
        },
        {
          model: ImagePT,
          as: "compromisoPago",
          attributes: ["name_image", "id"],
        },
        {
          model: Penalidad,
          as: "provPenalidad",
        },
        {
          model: Parametros_zonas,
          as: "zona",
        },
        {
          model: Gastos,
          as: "gasto",
        },
      ],
    });
    res.status(200).json({
      contratosProv,
      ok: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema",
    });
  }
  3;
};

// Obtener ContratoProv por ID
const GetContratoProvxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const contratosProv = await ContratoProv.findOne({
      where: { id, flag: true },
    });
    res.status(200).json({ msg: "ContratoProv obtenido", contratosProv });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (GetContratoProv)" });
  }
};

// Eliminar ContratoProv
const deleteContratoProvxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const contratosProv = await ContratoProv.findOne({
      where: { id, flag: true },
    });
    contratosProv.update({ flag: false });
    res.status(200).json({ msg: "ContratoProv eliminado correctamente" });
  } catch (error) {
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (deleteContratoProv)",
    });
  }
};

// Actualizar ContratoProv
const updateContratoProvxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const contratosProv = await ContratoProv.findOne({
      where: { id, flag: true },
    });
    contratosProv.update(req.body);
    res
      .status(200)
      .json({ msg: "ContratoProv actualizado correctamente", contratosProv });
  } catch (error) {
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (updateContratoProv)",
    });
  }
};
const obtenerComboContratosxIdProv = async (req = request, res = response) => {
  try {
    const { id_prov } = req.params;
    const contratosProv = await ContratoProv.findAll({
      where: {
        id_prov,
        flag: true,
      },
      attributes: [
        ["id", "value"],
        [
          Sequelize.fn(
            "CONCAT",
            Sequelize.col("id"),
            " | ",
            Sequelize.col("observacion")
          ),
          "label",
        ],
      ],
    });
    res.status(201).json({
      contratosProv,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (updateContratoProv)",
    });
  }
};
module.exports = {
  PostContratoProv,
  GetContratoProvs,
  GetContratoProvxID,
  deleteContratoProvxID,
  updateContratoProvxID,
  obtenerComboContratosxIdProv,
};
