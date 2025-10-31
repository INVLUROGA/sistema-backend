const { request, response } = require("express");
const { Op } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const ReservaMonkFit = require("../models/ReservaMonkFit");
const { Parametros } = require("../models/Parametros");
const normalizeToSqlDate = (v) => {
  if (!v) return null;
  let s = v instanceof Date ? null : String(v).trim();
  let d = v instanceof Date ? v : null;

  if (!d) {
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(s)) s = s.replace(" ", "T");
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) s += ":00";
    s = s.replace(/\.\d+$/, "");
    d = new Date(s);               // interpreta en hora LOCAL
  }
  if (!(d instanceof Date) || isNaN(d)) return null;

  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.000`;
};


const parseDateFlexible = (v) => {
  const s = normalizeToSqlDate(v);
  if (!s) return null;
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d) ? null : d;
};

const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (Object.prototype.hasOwnProperty.call(obj, k)) acc[k] = obj[k];
    return acc;
  }, {});

const validarEstadoCita = async (id_param) => {
  if (!id_param) return null;
  return Parametros.findOne({
    where: {
      id_param: Number(id_param),
      entidad_param: "citas",
      grupo_param: "estados-todos",
      estado_param: true,
      flag: true,
    },
  });
};

// ================== Endpoints ==================
const obtenerReservasMonkFit = async (req = request, res = response) => {
  try {
    const qLimit = parseInt(req.query.limit ?? "10", 10);
    const qPage = parseInt(req.query.page ?? "1", 10);
    const limit = Number.isFinite(qLimit) && qLimit > 0 ? qLimit : 10;
    const page = Number.isFinite(qPage) && qPage > 0 ? qPage : 1;
    const offset = (page - 1) * limit;

    const search = String(req.query.search ?? "").trim();
    const estadoFiltro = req.query.estado ? Number(req.query.estado) : null;

    const from = req.query.from ? parseDateFlexible(req.query.from) : null;
    const to = req.query.to ? parseDateFlexible(req.query.to) : null;
    if (to) to.setHours(23, 59, 59, 999);

    const where = { flag: true };
    if (estadoFiltro) where.id_estado_param = estadoFiltro;

    if (search) {
      if (search.startsWith("#")) {
        where.id = Number(search.slice(1)) || 0;
      } else {
        const asNum = Number(search);
        if (!Number.isNaN(asNum)) {
          where[Op.or] = [{ id_cli: asNum }, { codigo_reserva: { [Op.like]: `%${search}%` } }];
        } else {
          where.codigo_reserva = { [Op.like]: `%${search}%` };
        }
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
          model: require("../models/Usuarios").Cliente,
          as: "cliente",
          attributes: [
            "id_cli",
            "nombre_cli",
            "apPaterno_cli",
            "apMaterno_cli",
            "email_cli",
            "tel_cli",
          ],
        },
        {
          model: Parametros,
          as: "estado",
          attributes: ["id_param", "label_param"],
        },
      ],
    });

    res.json({ count: result.count, rows: result.rows, limit, offset });
  } catch (error) {
    console.error("LIST reservas error:", error);
    res.status(500).json({ message: "Error al obtener reservas" });
  }
};

const listarEstadosCita = async (_req = request, res = response) => {
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

const postReservaMonkFit = async (req = request, res = response) => {
  try {
    const b = req.body || {};

    const nCli = Number(b.id_cli);
    const nPgm = Number(b.id_pgm);
    if (!Number.isInteger(nCli) || !Number.isInteger(nPgm)) {
      return res.status(400).json({ message: "id_cli e id_pgm deben ser enteros" });
    }

    const f = normalizeToSqlDate(b.fecha);
    if (!f) return res.status(400).json({ message: "Fecha inválida", raw: b.fecha });

    let nEstado = null;
    if (b.id_estado_param !== undefined && b.id_estado_param !== null) {
      const ok = await validarEstadoCita(b.id_estado_param);
      if (!ok) return res.status(400).json({ message: "id_estado_param inválido" });
      nEstado = Number(b.id_estado_param);
    }

    const montoNum = b.monto_total != null ? Number(b.monto_total) : 0;
    if (Number.isNaN(montoNum)) {
      return res.status(400).json({ message: "monto_total inválido (no numérico)" });
    }
const sf = normalizeToSqlDate(req.body.fecha);
if (!sf || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.000$/.test(sf)) {
  return res.status(400).json({ message: "Fecha inválida", raw: req.body.fecha });
}
   const created = await ReservaMonkFit.create({
  id_cli: Number(req.body.id_cli),
  id_pgm: Number(req.body.id_pgm),
  id_estado_param: req.body.id_estado_param ?? null,
  codigo_reserva: req.body.codigo_reserva ?? null,
  fecha: db.literal(`CONVERT(datetime, '${f}', 121)`),
  monto_total: Number(req.body.monto_total ?? 0),
  flag: req.body.flag === undefined ? true : !!req.body.flag,
});

    return res.status(201).json(created);
  } catch (error) {
    console.error("CREATE reserva error:", error?.original || error);
    return res.status(400).json({
      message: "Error al crear la reserva",
      sql: error?.original?.sql,
      detail: error?.original?.message || error?.message || String(error),
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
      "codigo_reserva",
      "monto_total",
    ]);

    if (body.id_cli !== undefined) {
      if (!Number.isInteger(Number(body.id_cli)))
        return res.status(400).json({ message: "id_cli inválido" });
      body.id_cli = Number(body.id_cli);
    }

    if (body.id_pgm !== undefined) {
      if (!Number.isInteger(Number(body.id_pgm)))
        return res.status(400).json({ message: "id_pgm inválido" });
      body.id_pgm = Number(body.id_pgm);
    }

  if (body.fecha !== undefined) {
  const f = normalizeToSqlDate(body.fecha);
  if (!f || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.000$/.test(f)) {
    return res.status(400).json({ message: "Fecha inválida", raw: body.fecha });
  }
  body.fecha = db.literal(`CONVERT(datetime, '${f}', 121)`);
}


    if (body.id_estado_param !== undefined && body.id_estado_param !== null) {
      const ok = await validarEstadoCita(body.id_estado_param);
      if (!ok) return res.status(400).json({ message: "id_estado_param inválido" });
      body.id_estado_param = Number(body.id_estado_param);
    }

    if (body.monto_total !== undefined) {
      const montoNum = Number(body.monto_total);
      if (Number.isNaN(montoNum))
        return res.status(400).json({ message: "monto_total inválido (no numérico)" });
      body.monto_total = montoNum;
    }

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

// ================== Exports ==================
module.exports = {
  obtenerReservasMonkFit,
  listarEstadosCita,
  postReservaMonkFit,
  putReservaMonkFit,
  deleteReservaMonkFit,
};
