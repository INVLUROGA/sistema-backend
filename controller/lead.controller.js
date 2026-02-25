const { request, response } = require("express");
const { leadsxDia } = require("../models/Venta");
const NodeCache = require("node-cache");

const leadCache = new NodeCache({ stdTTL: 600 }); // 10 minutes cache

const postLead = async (req = request, res = response) => {
  try {
    const { fecha, cantidad, monto, id_red } = req.body;
    const { id_empresa } = req.params;
    const lead = new leadsxDia({
      fecha,
      cantidad,
      monto: monto * 1.18,
      id_empresa,
      id_red,
      flag: true,
    });
    await lead.save();

    // Cache invalidation
    leadCache.del(`leads_${id_empresa}`);

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
    const cacheKey = `leads_${id_empresa}`;
    const cachedLeads = leadCache.get(cacheKey);

    if (cachedLeads) {
      console.log(`[Cache Hit] ${cacheKey}`);
      return res.status(200).json({
        msg: "ok",
        leads: cachedLeads,
      });
    }

    console.log(`[Cache Miss] ${cacheKey} - Fetching from DB...`);
    const leads = await leadsxDia.findAll({
      where: { flag: true, id_empresa: id_empresa },
      order: [["fecha", "desc"]],
    });

    leadCache.set(cacheKey, leads);

    res.status(200).json({
      msg: "ok",
      leads,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Error al obtener leads" });
  }
};
const updateLeads = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const datosActualizar = req.body;
    if (datosActualizar.monto !== undefined) {
      datosActualizar.monto = datosActualizar.monto * 1.18;
    }

    const lead = await leadsxDia.findOne({ where: { id } });
    if (!lead) {
      return res.status(404).json({ msg: "Lead no encontrado" });
    }

    await lead.update(datosActualizar);

    // Cache invalidation
    if (lead.id_empresa) {
      leadCache.del(`leads_${lead.id_empresa}`);
    }

    res.status(200).json({
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
    if (!lead) {
      return res.status(404).json({ msg: "Lead no encontrado" });
    }

    await lead.update({ flag: false });

    // Cache invalidation
    if (lead.id_empresa) {
      leadCache.del(`leads_${lead.id_empresa}`);
    }

    res.status(200).json({
      msg: "lead eliminado",
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
