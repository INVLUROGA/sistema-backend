const { request, response } = require("express");
const { Files, ImagePT, DocumentosInternos } = require("../models/Image");
const uuid = require("uuid");
const postFiles = async (req = request, res = response) => {
  try {
    const { uid_file } = req.params;
    const UID = uuid.v4();
    const { id_tipo_file, observacion } = req.body;

    const file = new Files({
      id_tipo_file,
      uid_Location: uid_file,
      observacion,
      uid_file: UID,
      fecha_file: new Date(),
    });
    await file.save();
    res.status(201).json({
      ok: true,
      UID,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema (postFiles)",
    });
  }
};
const deleteFilexID = async (req = request, res = response) => {
  try {
    const { id_file } = req.params;
    console.log(id_file);

    const file = await Files.findOne({ where: { id: id_file } });
    file.update({ flag: false });
    res.status(200).json({
      ok: true,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema (deleteFiles)",
    });
  }
};
const obtenerFilesxUIDFILE = async (req = request, res = response) => {
  try {
    const { uid_Location } = req.params;
    const files = await Files.findAll({
      where: { uid_Location, flag: true },
      order: [["fecha_file", "desc"]],
      include: [
        {
          model: ImagePT,
          attributes: ["name_image"],
          where: { flag: true },
        },
      ],
    });
    res.status(200).json({
      all: files,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema (obtenerFilesxUIDFILE)",
    });
  }
};
// DOCUMENTOS INTERNOS
const postFileInterno = async (req = request, res = response) => {
  try {
    const { id_empresa, id_seccionVisible, uid_location } = req.params;
    const { fecha_registro, id_tipo_doc, titulo, observacion } = req.body;
    const uid_file = uuid.v4();
    const documentoInterno = new DocumentosInternos({
      id_empresa,
      fecha_registro,
      uid_location,
      uid_file: uid_file,
      id_tipo_doc,
      titulo,
      observacion,
      id_seccionVisible,
    });
    await documentoInterno.save();
    res.status(201).json({
      ok: true,
      documentoInterno,
      uid_file,
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      ok: false,
      msg: error,
    });
  }
};
const obtenerFileInternoxUidLocation = async (
  req = request,
  res = response
) => {
  try {
    const { id_seccionVisible } = req.params;
    const documentosInternos = await DocumentosInternos.findAll({
      where: { id_seccionVisible },
      // include: [
      //   {
      //     model: ImagePT,
      //     attributes: ["name_image"],
      //     where: { flag: true },
      //   },
      // ],
    });
    res.status(201).json({
      documentosInternos,
    });
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  postFiles,
  deleteFilexID,
  obtenerFilesxUIDFILE,
  postFileInterno,
  obtenerFileInternoxUidLocation,
};
