const { response, request } = require("express");
const { Op } = require("sequelize");
const { CanjeStatus, PublicacionesCanje } = require("../models/CanjeStatus");
const { Cliente } = require("../models/Usuarios");
const { ImagePT } = require("../models/Image");

const TIPOS_PUBLICACION = [1, 2]; // 1 = REEL, 2 = HISTORIA

const includeCliente = [
  {
    model: Cliente,
    as: "cliente",
    attributes: ["id_cli", "uid", "nombre_cli", "apPaterno_cli", "apMaterno_cli", "numDoc_cli"],
  },
];

// cliente + sus fotos (avatar), para la pantalla de status influencer
const includeClienteConFoto = [
  {
    model: Cliente,
    as: "cliente",
    attributes: ["id_cli", "uid", "nombre_cli", "apPaterno_cli", "apMaterno_cli", "numDoc_cli", "tipoCli_cli"],
    include: [
      {
        model: ImagePT,
        attributes: ["id", "name_image"],
        required: false,
      },
    ],
  },
];

const error500 = (res, error) => {
  console.log(error);
  res.status(500).json({ ok: false, msg: error.message });
};

/* ================= CANJE STATUS ================= */

const getCanjeStatus = async (req = request, res = response) => {
  try {
    const { id_empresa } = req.params;
    const canjeStatus = await CanjeStatus.findAll({
      where: { id_empresa, flag: true },
      order: [["id", "desc"]],
      include: includeClienteConFoto,
    });
    res.status(200).json({ ok: true, canjeStatus });
  } catch (error) {
    error500(res, error);
  }
};

const getCanjeStatusxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const canjeStatus = await CanjeStatus.findOne({
      where: { id, flag: true },
      include: includeCliente,
    });
    if (!canjeStatus) return res.status(404).json({ ok: false, msg: "No encontrado" });
    res.status(200).json({ ok: true, canjeStatus });
  } catch (error) {
    error500(res, error);
  }
};

const datosStatus = (body) => ({
  id_cli: body.id_cli,
  contrato: !!body.contrato,
  n_reel_acuerdo_x_mes: Number(body.n_reel_acuerdo_x_mes) || 0,
  n_historia_acuerdo_x_mes: Number(body.n_historia_acuerdo_x_mes) || 0,
  link: (body.link ?? "").trim() || null,
  observacion: (body.observacion ?? "").trim() || null,
});

const existeStatusCliente = (id_empresa, id_cli, idExcluir = null) =>
  CanjeStatus.findOne({
    where: {
      id_empresa,
      id_cli,
      flag: true,
      ...(idExcluir ? { id: { [Op.ne]: idExcluir } } : {}),
    },
  });

const postCanjeStatus = async (req = request, res = response) => {
  try {
    const { id_empresa } = req.params;
    const datos = datosStatus(req.body);
    if (!datos.id_cli) return res.status(400).json({ ok: false, msg: "Falta el cliente" });
    if (await existeStatusCliente(id_empresa, datos.id_cli)) {
      return res.status(400).json({ ok: false, msg: "El cliente ya tiene un status de canje" });
    }
    const canjeStatus = await CanjeStatus.create({ ...datos, id_empresa });
    res.status(201).json({ ok: true, canjeStatus });
  } catch (error) {
    error500(res, error);
  }
};

const putCanjeStatus = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const canjeStatus = await CanjeStatus.findOne({ where: { id } });
    if (!canjeStatus) return res.status(404).json({ ok: false, msg: "No encontrado" });
    const datos = datosStatus(req.body);
    if (!datos.id_cli) return res.status(400).json({ ok: false, msg: "Falta el cliente" });
    if (await existeStatusCliente(canjeStatus.id_empresa, datos.id_cli, id)) {
      return res.status(400).json({ ok: false, msg: "El cliente ya tiene un status de canje" });
    }
    await canjeStatus.update(datos);
    res.status(200).json({ ok: true, canjeStatus });
  } catch (error) {
    error500(res, error);
  }
};

const deleteCanjeStatus = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const canjeStatus = await CanjeStatus.findOne({ where: { id } });
    if (!canjeStatus) return res.status(404).json({ ok: false, msg: "No encontrado" });
    await canjeStatus.update({ flag: false });
    res.status(200).json({ ok: true, canjeStatus });
  } catch (error) {
    error500(res, error);
  }
};

/* ================= PUBLICACIONES CANJE ================= */

const getPublicacionesCanje = async (req = request, res = response) => {
  try {
    const { id_empresa } = req.params;
    const { id_cli } = req.query;
    const publicaciones = await PublicacionesCanje.findAll({
      where: { id_empresa, flag: true, ...(id_cli ? { id_cli } : {}) },
      order: [["fecha", "desc"], ["id", "desc"]],
      include: includeCliente,
    });
    res.status(200).json({ ok: true, publicaciones });
  } catch (error) {
    error500(res, error);
  }
};

const getPublicacionCanjexID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const publicacion = await PublicacionesCanje.findOne({
      where: { id, flag: true },
      include: includeCliente,
    });
    if (!publicacion) return res.status(404).json({ ok: false, msg: "No encontrado" });
    res.status(200).json({ ok: true, publicacion });
  } catch (error) {
    error500(res, error);
  }
};

const datosPublicacion = (body) => ({
  id_cli: body.id_cli,
  titulo: body.titulo,
  id_tipo: Number(body.id_tipo),
  fecha: body.fecha,
});

const validarPublicacion = (datos) => {
  if (!datos.id_cli) return "Falta el cliente";
  if (!TIPOS_PUBLICACION.includes(datos.id_tipo)) return "El tipo debe ser REEL o HISTORIA";
  if (!datos.fecha) return "Falta la fecha";
  return null;
};

const postPublicacionCanje = async (req = request, res = response) => {
  try {
    const { id_empresa } = req.params;
    const datos = datosPublicacion(req.body);
    const msg = validarPublicacion(datos);
    if (msg) return res.status(400).json({ ok: false, msg });
    const publicacion = await PublicacionesCanje.create({ ...datos, id_empresa });
    res.status(201).json({ ok: true, publicacion });
  } catch (error) {
    error500(res, error);
  }
};

const putPublicacionCanje = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const publicacion = await PublicacionesCanje.findOne({ where: { id } });
    if (!publicacion) return res.status(404).json({ ok: false, msg: "No encontrado" });
    const datos = datosPublicacion(req.body);
    const msg = validarPublicacion(datos);
    if (msg) return res.status(400).json({ ok: false, msg });
    await publicacion.update(datos);
    res.status(200).json({ ok: true, publicacion });
  } catch (error) {
    error500(res, error);
  }
};

const deletePublicacionCanje = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const publicacion = await PublicacionesCanje.findOne({ where: { id } });
    if (!publicacion) return res.status(404).json({ ok: false, msg: "No encontrado" });
    await publicacion.update({ flag: false });
    res.status(200).json({ ok: true, publicacion });
  } catch (error) {
    error500(res, error);
  }
};

module.exports = {
  getCanjeStatus,
  getCanjeStatusxID,
  postCanjeStatus,
  putCanjeStatus,
  deleteCanjeStatus,
  getPublicacionesCanje,
  getPublicacionCanjexID,
  postPublicacionCanje,
  putPublicacionCanje,
  deletePublicacionCanje,
};
