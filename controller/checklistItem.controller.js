const { request, response } = require("express");
const uid = require("uuid");
const { ChecklistItem } = require("../models/Checklist");
const { formatItem } = require("./checklist.controller");

const actualizarChecklistItem = async (req = request, res = response) => {
  const { id } = req.params;
  const { opciones, observacion, revisado } = req.body;
  try {
    const item = await ChecklistItem.findOne({ where: { id, flag: true } });

    if (!item) {
      return res.status(404).json({
        ok: false,
        msg: "El item del checklist no existe",
      });
    }

    const nuevaData = {
      opciones: JSON.stringify(opciones || []),
      observacion,
      revisado,
    };

    if (!item.uid_imagen_item) {
      nuevaData.uid_imagen_item = uid.v4();
    }
    if (!item.uid_foto_antes) {
      nuevaData.uid_foto_antes = uid.v4();
    }
    if (!item.uid_foto_despues) {
      nuevaData.uid_foto_despues = uid.v4();
    }

    await item.update(nuevaData);

    res.status(200).json({
      ok: true,
      msg: "ITEM ACTUALIZADO",
      item: formatItem(item),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error al actualizar el item del checklist",
    });
  }
};

module.exports = {
  actualizarChecklistItem,
};
