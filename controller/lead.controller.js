const { request, response } = require("express");
const { leadsxDia } = require("../models/Venta");

const postLead = async (req = request, res = response) => {
  try {
    const { fecha, cantidad, monto } = req.body;
    const { id_empresa } = req.params;
    const lead = new leadsxDia({
      fecha,
      cantidad,
      monto,
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
    });
    res.status(201).json({
      msg: "ok",
      leads,
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  postLead,
  getLeads,
};
