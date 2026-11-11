const { response, request } = require("express");
const uuid = require("uuid");
const { Actas } = require("../models/Actas");
const { ImagePT } = require("../models/Image");

// archivos del acta guardados en tb_image (uid_location = uid_documento)
const includeArchivos = [
  {
    model: ImagePT,
    as: "archivos",
    where: { flag: true },
    required: false,
  },
];

const limpiar = (v) => (typeof v === "string" ? v.trim() : v) || null;

const datosActa = (body) => ({
  titulo: limpiar(body.titulo),
  observacion: limpiar(body.observacion),
});

const getActas = async (req = request, res = response) => {
  try {
    const actas = await Actas.findAll({
      where: { flag: true },
      order: [["id", "desc"]],
      include: includeArchivos,
    });
    res.status(200).json({ ok: true, actas });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: error.message });
  }
};

const getActaxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const acta = await Actas.findOne({ where: { id, flag: true }, include: includeArchivos });
    if (!acta) {
      return res.status(404).json({ ok: false, msg: "No encontrado" });
    }
    res.status(200).json({ ok: true, acta });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: error.message });
  }
};

const postActa = async (req = request, res = response) => {
  try {
    const datos = datosActa(req.body);
    if (!datos.titulo) {
      return res.status(400).json({ ok: false, msg: "El titulo es obligatorio" });
    }
    const acta = await Actas.create({ ...datos, uid_documento: uuid.v4() });
    res.status(201).json({ ok: true, acta, uid_documento: acta.uid_documento });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: error.message });
  }
};

const putActa = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const datos = datosActa(req.body);
    if (!datos.titulo) {
      return res.status(400).json({ ok: false, msg: "El titulo es obligatorio" });
    }
    const acta = await Actas.findOne({ where: { id, flag: true } });
    if (!acta) {
      return res.status(404).json({ ok: false, msg: "No encontrado" });
    }
    // actas creadas antes de tener uid_documento reciben uno al editarse
    await acta.update({ ...datos, uid_documento: acta.uid_documento || uuid.v4() });
    res.status(200).json({ ok: true, acta, uid_documento: acta.uid_documento });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: error.message });
  }
};

const deleteActa = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const acta = await Actas.findOne({ where: { id, flag: true } });
    if (!acta) {
      return res.status(404).json({ ok: false, msg: "No encontrado" });
    }
    await acta.update({ flag: false });
    res.status(200).json({ ok: true, acta });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: error.message });
  }
};

// elimina (logicamente) un archivo del acta
const deleteArchivoActa = async (req = request, res = response) => {
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
  deleteArchivoActa,
  getActas,
  getActaxID,
  postActa,
  putActa,
  deleteActa,
};
