const { request, response } = require("express");
const { Op, QueryTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const ReservaMonkFit = require("../models/ReservaMonkFit");
const { Parametros } = require("../models/Parametros");
const ClienteMonkeyFit = require("../models/ClienteMonkeyFit");

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
  const dd = pad(local.getDate());
  const hh = pad(local.getHours());
  const mm = pad(local.getMinutes());
  const ss = pad(local.getSeconds());
  return `${y}-${m}-${dd} ${hh}:${mm}:${ss}.000`;
};

const parseFecha = (s) => {
  if (!s) return null;
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    const [dd, mm, yyyy, hhmm] = String(s).split(/[/\s]/);
    const [hh = "00", mi = "00"] = (hhmm || "").split(":");
    const d = new Date(+yyyy, +mm - 1, +dd, +hh, +mi, 0, 0);
    return isNaN(d) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
};
const toMssqlLocal = (d) => toMssql(parseFecha(d));

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
      estado_param: true,
      flag: true,
    },
  });
};


async function findProgramaIdByName(name) {
  if (!name) return null;
  const [row] = await db.query(
    `SELECT TOP 1 id_pgm = COALESCE(id_pgm, id, p_id_pgm)
       FROM tb_programaTraining
      WHERE (name_pgm = :n OR sigla_pgm = :n) AND (estado_pgm = 1 OR estado_pgm IS NULL)
      ORDER BY id_pgm ASC`,
    { replacements: { n: name }, type: QueryTypes.SELECT }
  );
  return row?.id_pgm ?? null;
}

async function findEstadoIdByLabel(label) {
  if (!label) return null;
  const row = await Parametros.findOne({
    where: {
      entidad_param: "citas",
      grupo_param: "estados-todos",
      estado_param: true,
      flag: true,
      label_param: { [Op.like]: label },
    },
    attributes: ["id_param"],
  });
  return row?.id_param ?? null;
}

async function getOrCreateClienteMF({ nombre, apellido, email }) {
  if (!email) return null;
  let cli = await ClienteMonkeyFit.findOne({ where: { email_cli: email } });
  if (!cli) {
    cli = await ClienteMonkeyFit.create({
      nombre_cli: nombre || null,
      apellido_cli: apellido || null,
      email_cli: email,
      flag: true,
    });
  }
  return cli.id_cliente_mf;
}

const importExcelReservas = async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (rows.length === 0) {
      return res.status(400).json({ message: "Sin filas para importar" });
    }

    const toInsert = [];
    for (const r of rows) {
      const id_cliente_mf = await getOrCreateClienteMF({
        nombre: r.nombre,
        apellido: r.apellido,
        email: r.email,
      });
      const id_pgm = await findProgramaIdByName(r.pgm_name);
      const id_estado_param = await findEstadoIdByLabel(r.status_text);
      const fecha = toMssqlLocal(r.fecha);
      const monto_total = Number(r.total || 0);
      const codigo_reserva = r.codigo_reserva?.trim() || null;

      if (!id_cliente_mf || !id_pgm || !fecha) continue;

      toInsert.push({
        id_cliente_mf,
        id_pgm,
        id_estado_param,
        fecha,
        monto_total,
        codigo_reserva,
        flag: true,
      });
    }

    if (toInsert.length === 0) {
      return res.status(400).json({ message: "No hay filas válidas para insertar" });
    }

    const created = await ReservaMonkFit.bulkCreate(toInsert, { validate: true });
    res.status(201).json({ inserted: created.length });
  } catch (e) {
    console.error("IMPORT reservas error:", e);
    res.status(500).json({ message: "Error al importar Excel", detail: String(e?.original?.message || e) });
  }
};


const obtenerReservasMonkFit = async (req = request, res = response) => {
  try {
    const qLimit = parseInt(req.query.limit ?? "10", 10);
    const qOffsetRaw = req.query.offset ?? null;
    const qPageRaw = req.query.page ?? null;

    const limit = Math.max(qLimit, 1);
    let offset = 0;
    if (qOffsetRaw !== null) {
      offset = Math.max(parseInt(qOffsetRaw, 10) || 0, 0);
    } else {
      const page = Math.max(parseInt(qPageRaw ?? "1", 10), 1);
      offset = (page - 1) * limit;
    }

    const search = String(req.query.search ?? "").trim();
    const onlyActive = String(req.query.onlyActive ?? "true").toLowerCase() !== "false";
    const estadoFiltro = req.query.estado ? Number(req.query.estado) : null;

    const from = req.query.from ? toDate(req.query.from) : null;
    const to = req.query.to ? toDate(req.query.to) : null;
    if (to) to.setHours(23, 59, 59, 999);

    const where = {};
    if (onlyActive) where.flag = true;
    if (estadoFiltro) where.id_estado_param = estadoFiltro;

    if (search) {
      if (search.startsWith("#")) {
        where.id = Number(search.slice(1)) || 0;
      } else {
        const asNum = Number(search);
        if (!Number.isNaN(asNum)) {
          where[Op.or] = [
            { id_cliente_mf: asNum },
            { codigo_reserva: { [Op.like]: `%${search}%` } },
          ];
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
          model: ClienteMonkeyFit,
          as: "cliente",
          attributes: ["id_cliente_mf", "nombre_cli", "apellido_cli", "email_cli", "cant_reservas"],
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
    const body = req.body || {};
    const nCli = Number(body.id_cliente_mf ?? body.id_cli);
    const nPgm = Number(body.id_pgm);

    if (!Number.isInteger(nCli) || !Number.isInteger(nPgm)) {
      return res.status(400).json({ message: "id_cliente_mf (o id_cli) e id_pgm deben ser enteros" });
    }

    const f = toMssql(body.fecha);
    if (!f) return res.status(400).json({ message: "Fecha inválida o vacía" });

    let nEstado = null;
    if (body.id_estado_param !== undefined && body.id_estado_param !== null) {
      const check = await validarEstadoCita(body.id_estado_param);
      if (!check) {
        return res.status(400).json({ message: "id_estado_param inválido (Parametros.citas/estados-todos)" });
      }
      nEstado = Number(body.id_estado_param);
    }

    const montoNum = body.monto_total != null ? Number(body.monto_total) : 0;
    if (Number.isNaN(montoNum)) {
      return res.status(400).json({ message: "monto_total inválido (no numérico)" });
    }

    const created = await ReservaMonkFit.create({
      id_cliente_mf: nCli,
      id_pgm: nPgm,
      id_estado_param: nEstado,
      fecha: f,
      flag: body.flag === undefined ? true : !!body.flag,
      codigo_reserva: body.codigo_reserva ?? null,
      monto_total: montoNum,
    });
const cliente = await ClienteMonkeyFit.findByPk(nCli);
if (cliente) {
  await cliente.update({
    cant_reservas: (cliente.cant_reservas ?? 0) + 1,
    fecha_ultima_reserva: new Date(),
    fecha_primera_reserva: cliente.fecha_primera_reserva ?? new Date(),
    total_gastado: (cliente.total_gastado ?? 0) + montoNum,
  });
}
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
      "id_cliente_mf", 
      "id_cli",        
      "id_pgm",
      "id_estado_param",
      "fecha",
      "flag",
      "codigo_reserva",
      "monto_total",
    ]);

    if (body.id_cli !== undefined && body.id_cliente_mf === undefined) {
      body.id_cliente_mf = Number(body.id_cli);
      delete body.id_cli;
    }
    if (body.id_cliente_mf !== undefined) {
      if (!Number.isInteger(Number(body.id_cliente_mf))) {
        return res.status(400).json({ message: "id_cliente_mf inválido" });
      }
      body.id_cliente_mf = Number(body.id_cliente_mf);
    }

    if (body.id_pgm !== undefined) {
      if (!Number.isInteger(Number(body.id_pgm))) {
        return res.status(400).json({ message: "id_pgm inválido" });
      }
      body.id_pgm = Number(body.id_pgm);
    }

    if (body.fecha !== undefined) {
      const f = toMssql(body.fecha);
      if (!f) return res.status(400).json({ message: "Fecha inválida" });
      body.fecha = f;
    }

    if (body.id_estado_param !== undefined && body.id_estado_param !== null) {
      const ok = await validarEstadoCita(body.id_estado_param);
      if (!ok) {
        return res.status(400).json({
          message: "id_estado_param inválido (Parametros.citas/estados-todos)",
        });
      }
      body.id_estado_param = Number(body.id_estado_param);
    }

    if (body.monto_total !== undefined) {
      const montoNum = Number(body.monto_total);
      if (Number.isNaN(montoNum)) {
        return res.status(400).json({ message: "monto_total inválido (no numérico)" });
      }
      body.monto_total = montoNum;
    }

    if (body.flag !== undefined) {
      body.flag = !!body.flag;
    }

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

const seedReservaMonkFit = async (_req = request, res = response) => {
  try {
    await db.sync({ alter: true });
    const ESTADO_PENDIENTE = 1427;

    const reserva = await ReservaMonkFit.create({
      id_cliente_mf: 5, 
      id_pgm: 2,
      id_estado_param: ESTADO_PENDIENTE,
      fecha: toMssql(new Date()),
      flag: true,
      codigo_reserva: "TEST123",
      monto_total: 19.0,
    });

    res.status(201).json({ message: "✅ Reserva de prueba creada correctamente", data: reserva });
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
  importExcelReservas,
};
