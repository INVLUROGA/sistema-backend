const { request, response } = require("express");
const { Op } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const ReservaMonkFit = require("../models/ReservaMonkFit");
const { Parametros } = require("../models/Parametros"); 

const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const toMssql = (v) => {
  const d = toDate(v);
  if (!d) return null;
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  const y = local.getFullYear();
  const m = pad(local.getMonth() + 1);
  const day = pad(local.getDate());
  const hh = pad(local.getHours());
  const mm = pad(local.getMinutes());
  const ss = pad(local.getSeconds());
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}.000`;
};

const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});

const validarEstadoCita = async (id_param) => {
  if (!id_param) return null;
  return Parametros.findOne({
    where: {
      id_param: Number(id_param),
      entidad_param: "citas",
      grupo_param: "estados-todos",
      estado_param: true, // boolean en tu modelo
      flag: true,
    },
  });
};

const obtenerReservasMonkFit = async (req = request, res = response) => {
  try {
    const page = Math.max(parseInt(req.query.page ?? "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit ?? "10", 10), 1);
    const offset = (page - 1) * limit;

    const search = String(req.query.search ?? "").trim();
    const onlyActive =
      String(req.query.onlyActive ?? "true").toLowerCase() !== "false";
    const estadoFiltro = req.query.estado ? Number(req.query.estado) : null; // id_param

    const from = req.query.from ? toDate(req.query.from) : null;
    const to = req.query.to ? toDate(req.query.to) : null;
    if (to) to.setHours(23, 59, 59, 999);

    const where = {};
    if (onlyActive) where.flag = true;
    if (estadoFiltro) where.id_estado_param = estadoFiltro;

    if (search) {
      const asNum = Number(search);
      if (!Number.isNaN(asNum)) {
        where.id_cli = asNum;
      } else if (search.startsWith("#")) {
        where.id = Number(search.slice(1)) || 0;
      }
    }

    if (from || to) {
      where.fecha = {};
      if (from) where.fecha[Op.gte] = from;
      if (to) where.fecha[Op.lte] = to;
    }

    const result = await ReservaMonkFit.findAndCountAll({
      where,
      order: [["id", "DESC"]],
      limit,
      offset,
      include: [
        {
          model: Parametros,
          as: "estado",
          attributes: ["id_param", "label_param"],
        },
      ],
    });

    res.json({
      page,
      limit,
      count: result.count,
      rows: result.rows,
    });
  } catch (error) {
    console.error("LIST reservas error:", error);
    res.status(500).json({ message: "Error al obtener reservas" });
  }
};


const listarEstadosCita = async (_req, res) => {
  try {
    const rows = await Parametros.findAll({
      where: {
        entidad_param: "citas",
        grupo_param: "estados-todos",
        estado_param: true,
        flag: true,
      },
      order: [
        ["orden_param", "ASC"],
        ["id_param", "ASC"],
      ],
      attributes: ["id_param", "label_param"],
    });
    res.json(rows);
  } catch (e) {
    console.error("LIST estados error:", e);
    res.status(500).json({ message: "Error al listar estados" });
  }
};


const postReservaMonkFit = async (req, res) => {
  try {
    const { id_cli, id_pgm, fecha, id_estado_param, flag } = req.body;

    const nCli = Number(id_cli);
    const nPgm = Number(id_pgm);
    if (!Number.isInteger(nCli) || !Number.isInteger(nPgm)) {
      return res.status(400).json({ message: "id_cli o id_pgm inválidos" });
    }

    if (id_estado_param) {
      const ok = await validarEstadoCita(id_estado_param);
      if (!ok)
        return res
          .status(400)
          .json({ message: "id_estado_param inválido (citas/estados-todos)" });
    }

    const f = toMssql(fecha);
    if (!f) return res.status(400).json({ message: "Fecha inválida" });

    const created = await ReservaMonkFit.create({
      id_cli: nCli,
      id_pgm: nPgm,
      id_estado_param: id_estado_param ? Number(id_estado_param) : null,
      fecha: f,
      flag: flag === undefined ? true : !!flag,
    });

    res.status(201).json(created);
  } catch (error) {
    console.error("CREATE reserva error:", error?.original || error);
    res.status(400).json({
      message: "Error al crear la reserva",
      detail: error?.original?.message || String(error),
    });
  }
};


const putReservaMonkFit = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const reserva = await ReservaMonkFit.findByPk(id);
    if (!reserva) return res.status(404).json({ message: "Reserva no encontrada" });

    const body = pick(req.body, [
      "id_cli",
      "id_pgm",
      "id_estado_param",
      "fecha",
      "flag",
    ]);

    if (body.fecha !== undefined) {
      const f = toMssql(body.fecha);
      if (!f) return res.status(400).json({ message: "Fecha inválida" });
      body.fecha = f;
    }

    if (body.id_estado_param !== undefined && body.id_estado_param !== null) {
      const ok = await validarEstadoCita(body.id_estado_param);
      if (!ok)
        return res
          .status(400)
          .json({ message: "id_estado_param inválido (citas/estados-todos)" });
      body.id_estado_param = Number(body.id_estado_param);
    }

    if (body.id_cli !== undefined) body.id_cli = Number(body.id_cli);
    if (body.id_pgm !== undefined) body.id_pgm = Number(body.id_pgm);
    if (body.flag !== undefined) body.flag = !!body.flag;

    await reserva.update(body);
    res.json(reserva);
  } catch (error) {
    console.error("UPDATE reserva error:", error?.original || error);
    res.status(400).json({
      message: "Error al actualizar la reserva",
      detail: error?.original?.message || String(error),
    });
  }
};

const deleteReservaMonkFit = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const reserva = await ReservaMonkFit.findByPk(id);
    if (!reserva) return res.status(404).json({ message: "Reserva no encontrada" });

    await reserva.update({ flag: false });
    res.json({ ok: true });
  } catch (error) {
    console.error("DELETE reserva error:", error);
    res.status(500).json({ message: "Error al eliminar la reserva" });
  }
};


const seedReservaMonkFit = async (req = request, res = response) => {
  try {
    await db.sync({ alter: true });

    const ESTADO_PENDIENTE = 1427;

    const reserva = await ReservaMonkFit.create({
      id_cli: 5,
      id_pgm: 2,
      id_estado_param: ESTADO_PENDIENTE,
      fecha: toMssql(new Date()),
      flag: true,
    });

    res.status(201).json({
      message: "✅ Reserva de prueba creada correctamente",
      data: reserva,
    });
  } catch (error) {
    console.error("SEED reserva error:", error?.original || error);
    res.status(500).json({
      message: "Error al crear reserva de prueba",
      detail: error?.original?.message || String(error),
    });
  }
};

module.exports = {
  obtenerReservasMonkFit,
  listarEstadosCita,
  postReservaMonkFit,
  putReservaMonkFit,
  deleteReservaMonkFit,
  seedReservaMonkFit,
};
