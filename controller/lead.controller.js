const { request, response } = require("express");
const { leadsxDia } = require("../models/Venta");

const postLead = async (req = request, res = response) => {
  try {
    const { fecha, cantidad, monto } = req.body;
    const { id_empresa } = req.params;
    const lead = new leadsxDia({
      fecha,
      cantidad,
      monto: monto * 1.18,
      id_empresa,
      flag: true,
    });
    await lead.save();
    res.status(201).json({
      msg: "ok",
      lead,
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      msg: "not",
    });
  }
};
const getLeads = async (req = request, res = response) => {
  const { id_empresa } = req.params;
  try {
    const leads = await leadsxDia.findAll({
      where: { flag: true, id_empresa: id_empresa },
      order: [["fecha", "desc"]],
    });
    res.status(201).json({
      msg: "ok",
      leads,
    });
  } catch (error) {
    console.log(error);
  }
};
const updateLeads = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const lead = await leadsxDia.findOne({ where: { id } });
    await lead.update(req.body);
    res.status(201).json({
      msg: "lead actualizado",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: `error actualizado: ${error}`,
    });
  }
};
const deleteLeads = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const lead = await leadsxDia.findOne({ where: { id } });
    await lead.update({ flag: false });
    res.status(201).json({
      msg: "lead actualizado",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: `error actualizado: ${error}`,
    });
  }
};
module.exports = {
  postLead,
  getLeads,
  updateLeads,
  deleteLeads,
};
