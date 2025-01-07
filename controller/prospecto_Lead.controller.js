const { request, response } = require("express");
const { ProspectoLead } = require("../models/ProspectoLead");
const uuid = require("uuid");
const { Empleado } = require("../models/Usuarios");
const { Sequelize } = require("sequelize");
const { Parametros } = require("../models/Parametros");
const { Distritos } = require("../models/Distritos");
const { Comentario } = require("../models/Modelos");
const postProspectoLead = async (req = request, res = response) => {
  try {
    const uid = uuid.v4();

    const prospecto = new ProspectoLead({
      ...req.body,
      uid_comentario: uid,
    });
    await prospecto.save();
    res.status(200).json(prospecto);
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema",
    });
  }
};
const getProspectosLead = async (req = request, res = response) => {
  try {
    const prospectosLeads = await ProspectoLead.findAll({
      where: { flag: true },
      order: [["id", "desc"]],
      include: [
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
          as: "empleado",
        },
        {
          model: Parametros,
          as: "parametro_canal",
        },
        {
          model: Parametros,
          as: "parametro_campania",
        },
        {
          model: Parametros,
          as: "parametro_estado_lead",
        },
        {
          model: Distritos,
          as: "lead_distrito",
        },
        {
          model: Comentario,
          as: "comentario",
        },
      ],
    });
    res.status(200).json({
      msg: true,
      prospectosLeads,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema",
    });
  }
};
const getProspectoLeadPorID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(404).json({
        ok: false,
        msg: "No hay id",
      });
    }
    const prospectoLead = await ProspectoLead.findOne({
      where: { flag: true, id: id },
    });
    if (!prospectoLead) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un prospectoLead con el id "${id}"`,
      });
    }
    res.status(200).json({
      prospectoLead,
    });
  } catch (error) {
    res.status(500).json({
      ok: true,
      msg: "Hable con el encargado de sistema",
    });
  }
};
const putProspectoLead = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const prospectoLead = await ProspectoLead.findByPk(id);
    if (!prospectoLead) {
      return res.status(404).json({
        ok: false,
        msg: "No hay ningun prospectoLead con ese id",
      });
    }

    prospectoLead.update(req.body);
    res.status(200).json({
      prospectoLead,
    });
  } catch (error) {
    res.status(500).json({
      ok: true,
      msg: "Error al eliminar el prospecto. Hable con el encargado de sistema",
      error: error.message,
    });
  }
};
const deleteProspectoLead = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const prospectoLead = await ProspectoLead.findByPk(id, { flag: true });
    if (!prospectoLead) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un prospectoLead con el id "${id}"`,
      });
    }
    prospectoLead.update({ flag: false });
    res.status(200).json({
      prospectoLead,
    });
  } catch (error) {
    res.status(500).json({
      ok: true,
      msg: "Error al eliminar el prospecto. Hable con el encargado de sistema",
      error: error.message,
    });
  }
};
module.exports = {
  postProspectoLead,
  getProspectosLead,
  getProspectoLeadPorID,
  putProspectoLead,
  deleteProspectoLead,
};
