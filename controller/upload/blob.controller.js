const { response, request } = require("express");
const { blobService } = require("../../config/blobstorage");
const { extname } = require("path");
const { ImagePT } = require("../../models/Image");
const uid = require("uuid");
const uploadBlob = async (req = request, res = response) => {
  try {
    // const { container } = req.body;
    const { container } = req.query;
    console.log({ filesito: req.file });

    const { originalname, buffer } = req.file;
    const { uid_location } = req.params;
    const extension = extname(originalname);
    const name = originalname.split(extension)[0];
    // console.log(extname(originalname), originalname.split(extname(originalname))[0]);
    const name_image = `${name}-${Date.now()}${extension}`;
    const containerClient = blobService.getContainerClient(container);
    await containerClient.getBlockBlobClient(name_image).uploadData(buffer);

    const img = new ImagePT({
      uid_location: uid_location,
      name_image: name_image,
      extension_image: extension,
      clasificacion_image: container,
      size_image: req.file.size,
      uid: uid.v4(),
    });
    await img.save();
    res.status(200).json({
      msg: "success",
      img,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: `Error en el servidor, en controller de uploadBlob, hable con el administrador: ${error}`,
    });
  }
};
const getImagesxUID = async (req = request, res = response) => {
  try {
    const { uidLocation } = req.params;
    const img = await ImagePT.findAll({
      where: { uid_location: uidLocation, flag: true },
    });
    // console.log(img, uidLocation);
    res.status(200).json(img);
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor(getUpload), hable con el administrador: ${error}`,
    });
  }
};

const getUploadOnexUidLocation = async (req = request, res = response) => {
  try {
    console.log(req.params);

    const { uidLocation } = req.params;
    const img = await ImagePT.findOne({
      where: { uid_location: uidLocation, flag: true },
      order: [["updatedAt", "desc"]],
    });
    // console.log(img, uidLocation);
    res.status(200).json(img);
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor(getUpload), hable con el administrador: ${error}`,
    });
  }
};
const postUploadsImgs = async (req, res) => {
  try {
    console.log("holaaaaaaaaaaaaaa");
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor(getUpload), hable con el administrador: ${error}`,
    });
  }
};
const viewFile = async (req = request, res = response) => {
  try {
    const { containerName } = req.query;
    const containerClient = blobService.getContainerClient(containerName);
    // OJO: el fileName viene URL-encodeado
    const fileName = decodeURIComponent(req.params.fileName);
    if (!fileName) {
      return res.status(400).send("Falta el nombre del archivo");
    }

    const blobClient = containerClient.getBlobClient(fileName);
    const exists = await blobClient.exists();
    if (!exists) {
      return res.status(404).send("No se encontró el archivo");
    }
    const downloadResponse = await blobClient.download();
    // Cabeceras para que se vea en el navegador (inline) y como PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(fileName)}"`
    );
    // Pipe del stream hacia la respuesta
    downloadResponse.readableStreamBody.pipe(res);
  } catch (error) {}
};
module.exports = {
  getImagesxUID,
  uploadBlob,
  getUploadOnexUidLocation,
  postUploadsImgs,
  viewFile,
};
