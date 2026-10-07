const { request, response } = require("express");
const { ProspectoLead } = require("../models/ProspectoLead");
const { TareaProspecto } = require("../models/TareaProspecto");
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
      fecha_registro: new Date(),
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
                Sequelize.col("apMaterno_empl"),
              ),
              "nombres_apellidos_empl",
            ],
          ],
          as: "empleado",
        },
        {
          model: Parametros,
          as: "parametro_estado",
        },
        {
          model: Parametros,
          as: "parametro_canal",
        },
        {
          model: Parametros,
          as: "parametro_medio_comunicacion",
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

    await prospectoLead.update(req.body);
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
    await prospectoLead.update({ flag: false });
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
// Registra una tarea sobre el lead; la fecha es la del momento del registro.
const postTareaProspectoLead = async (req = request, res = response) => {
  try {
    const { id_prospecto, id_tarea, observacion } = req.body;
    if (!id_prospecto || !id_tarea) {
      return res.status(400).json({
        ok: false,
        msg: "Faltan id_prospecto o id_tarea",
      });
    }
    const tarea = await TareaProspecto.create({
      id_prospecto,
      id_tarea,
      observacion: observacion || null,
      fecha: new Date(),
    });
    res.status(200).json({ ok: true, tarea });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error al registrar la tarea. Hable con el encargado de sistema",
    });
  }
};
const getTareasProspectoLead = async (req = request, res = response) => {
  try {
    const { id_prospecto } = req.params;
    const tareas = await TareaProspecto.findAll({
      where: { id_prospecto, flag: true },
      order: [["fecha", "desc"]],
    });
    res.status(200).json({ ok: true, tareas });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error al obtener las tareas. Hable con el encargado de sistema",
    });
  }
};
module.exports = {
  postProspectoLead,
  getProspectosLead,
  getProspectoLeadPorID,
  putProspectoLead,
  deleteProspectoLead,
  postTareaProspectoLead,
  getTareasProspectoLead,
};
