const { response, request } = require("express");
const uuid = require("uuid");
const { CalendarioMarketing } = require("../models/CalendarioMarketing");
const { ImagePT } = require("../models/Image");
const { Parametros } = require("../models/Parametros");

const includeCalendario = [
  {
    model: ImagePT,
    as: "archivos",
    where: { flag: true },
    required: false,
  },
  {
    model: ImagePT,
    as: "imagenes",
    where: { flag: true },
    required: false,
  },
  {
    model: Parametros,
    as: "tipo",
    attributes: ["id_param", "label_param"],
  },
];

const getCalendarioMarketing = async (req = request, res = response) => {
  try {
    const { id_empresa } = req.params;
    const calendario = await CalendarioMarketing.findAll({
      where: { id_empresa, flag: true },
      order: [["fecha_inicio", "desc"]],
      include: includeCalendario,
    });
    res.status(200).json({ ok: true, calendario });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: error.message });
  }
};

const getCalendarioMarketingxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const calendario = await CalendarioMarketing.findOne({
      where: { id, flag: true },
      include: includeCalendario,
    });
    if (!calendario) {
      return res.status(404).json({ ok: false, msg: "No encontrado" });
    }
    res.status(200).json({ ok: true, calendario });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: error.message });
  }
};

const postCalendarioMarketing = async (req = request, res = response) => {
  try {
    const { id_empresa } = req.params;
    const { fecha_inicio, fecha_fin, id_tipo, titulo, observacion } = req.body;
    const calendario = await CalendarioMarketing.create({
      id_empresa,
      fecha_inicio,
      fecha_fin: fecha_fin || fecha_inicio,
      id_tipo,
      titulo,
      observacion,
      uid_file: uuid.v4(),
      uid_images: uuid.v4(),
    });
    res.status(201).json({
      ok: true,
      calendario,
      uid_file: calendario.uid_file,
      uid_images: calendario.uid_images,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: error.message });
  }
};

const putCalendarioMarketing = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const { fecha_inicio, fecha_fin, id_tipo, titulo, observacion } = req.body;
    const calendario = await CalendarioMarketing.findOne({ where: { id } });
    if (!calendario) {
      return res.status(404).json({ ok: false, msg: "No encontrado" });
    }
    await calendario.update({
      fecha_inicio,
      fecha_fin: fecha_fin || fecha_inicio,
      id_tipo,
      titulo,
      observacion,
      // eventos antiguos sin uid reciben uno al editarse
      uid_file: calendario.uid_file || uuid.v4(),
      uid_images: calendario.uid_images || uuid.v4(),
    });
    res.status(200).json({
      ok: true,
      calendario,
      uid_file: calendario.uid_file,
      uid_images: calendario.uid_images,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: error.message });
  }
};

const deleteCalendarioMarketing = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const calendario = await CalendarioMarketing.findOne({ where: { id } });
    if (!calendario) {
      return res.status(404).json({ ok: false, msg: "No encontrado" });
    }
    await calendario.update({ flag: false });
    res.status(200).json({ ok: true, calendario });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: error.message });
  }
};

// elimina (lógicamente) una foto/documento adjunto
const deleteArchivoCalendario = async (req = request, res = response) => {
  try {
    const { id_image } = req.params;
    const img = await ImagePT.findOne({ where: { id: id_image } });
    if (!img) {
      return res.status(404).json({ ok: false, msg: "No encontrado" });
    }
    await img.update({ flag: false });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: error.message });
  }
};

module.exports = {
  getCalendarioMarketing,
  getCalendarioMarketingxID,
  postCalendarioMarketing,
  putCalendarioMarketing,
  deleteCalendarioMarketing,
  deleteArchivoCalendario,
};
