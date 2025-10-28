// controller/cliente_mf.controller.js
const { request, response } = require("express");
const { Op } = require("sequelize");

const ClienteMonkeyFit = require("../models/ClienteMonkeyFit");
const { db } = require("../database/sequelizeConnection");

// helper para parsear fecha tipo "26/06/2025 18:00" o ISO a Date real
const parseFecha = (v) => {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v)) return v;

  const s = String(v).trim();

  // dd/mm/yyyy hh:mm
  const m = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/
  );
  if (m) {
    const [, dd, MM, yyyy, hh = "00", mm = "00"] = m;
    const d = new Date(+yyyy, +MM - 1, +dd, +hh, +mm, 0, 0);
    return isNaN(d) ? null : d;
  }

  // intento ISO u otros
  const d = new Date(s);
  return isNaN(d) ? null : d;
};

// ============================
// GET /api/cliente_mf
// ?page=&limit=&search=...
// solo activos por defecto
// ============================
const listClientesMF = async (req = request, res = response) => {
  try {
    const page = Math.max(parseInt(req.query.page ?? "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit ?? "10", 10), 1);
    const offset = (page - 1) * limit;

    const search = String(req.query.search ?? "").trim();
    const onlyActive =
      String(req.query.onlyActive ?? "true").toLowerCase() !== "false";

    const where = {};
    if (onlyActive) where.flag = true;

    if (search) {
      // búsqueda por nombre, apellido, email o teléfono
      where[Op.or] = [
        { nombre_cli: { [Op.like]: `%${search}%` } },
        { apellido_cli: { [Op.like]: `%${search}%` } },
        { email_cli: { [Op.like]: `%${search}%` } },
        { telefono_cli: { [Op.like]: `%${search}%` } },
        // si escribes "#123" => buscar por id_cliente_mf
        search.startsWith("#")
          ? { id_cliente_mf: Number(search.slice(1)) || 0 }
          : null,
      ].filter(Boolean);
    }

    const result = await ClienteMonkeyFit.findAndCountAll({
      where,
      limit,
      offset,
      order: [["id_cliente_mf", "DESC"]],
    });

    res.json({
      page,
      limit,
      count: result.count,
      rows: result.rows,
    });
  } catch (error) {
    console.error("LIST clientes MF error:", error);
    res
      .status(500)
      .json({ message: "Error al obtener clientes (monkeyfit)" });
  }
};

// ============================
// GET /api/cliente_mf/:id
// ============================
const getClienteMF = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const cli = await ClienteMonkeyFit.findByPk(id);
    if (!cli)
      return res
        .status(404)
        .json({ message: "Cliente no encontrado (monkeyfit)" });

    res.json(cli);
  } catch (error) {
    console.error("GET cliente MF error:", error);
    res.status(500).json({ message: "Error al obtener cliente" });
  }
};

// ============================
// POST /api/cliente_mf
// body: { nombre_cli, apellido_cli, email_cli, telefono_cli,
//         fecha_primera_reserva, fecha_ultima_reserva, total_gastado }
// ============================
const createClienteMF = async (req = request, res = response) => {
  try {
    const {
      nombre_cli,
      apellido_cli,
      email_cli,
      telefono_cli,
      fecha_primera_reserva,
      fecha_ultima_reserva,
      total_gastado,
    } = req.body;

    const nuevo = await ClienteMonkeyFit.create({
      nombre_cli: nombre_cli ?? null,
      apellido_cli: apellido_cli ?? null,
      email_cli: email_cli ?? null,
      telefono_cli: telefono_cli ?? null,
      fecha_primera_reserva: parseFecha(fecha_primera_reserva),
      fecha_ultima_reserva: parseFecha(fecha_ultima_reserva),
      total_gastado:
        total_gastado !== undefined && total_gastado !== null
          ? Number(total_gastado)
          : 0,
      flag: true,
    });

    res.status(201).json(nuevo);
  } catch (error) {
    console.error("CREATE cliente MF error:", error?.original || error);
    res.status(400).json({
      message: "Error al crear cliente monkeyfit",
      detail: error?.original?.message || String(error),
    });
  }
};

// ============================
// PUT /api/cliente_mf/:id
// Actualiza campos básicos
// ============================
const updateClienteMF = async (req = request, res = response) => {
  try {
    const { id } = req.params;

    const cli = await ClienteMonkeyFit.findByPk(id);
    if (!cli)
      return res
        .status(404)
        .json({ message: "Cliente no encontrado (monkeyfit)" });

    const {
      nombre_cli,
      apellido_cli,
      email_cli,
      telefono_cli,
      fecha_primera_reserva,
      fecha_ultima_reserva,
      total_gastado,
      flag,
    } = req.body;

    await cli.update({
      ...(nombre_cli !== undefined && { nombre_cli }),
      ...(apellido_cli !== undefined && { apellido_cli }),
      ...(email_cli !== undefined && { email_cli }),
      ...(telefono_cli !== undefined && { telefono_cli }),
      ...(fecha_primera_reserva !== undefined && {
        fecha_primera_reserva: parseFecha(fecha_primera_reserva),
      }),
      ...(fecha_ultima_reserva !== undefined && {
        fecha_ultima_reserva: parseFecha(fecha_ultima_reserva),
      }),
      ...(total_gastado !== undefined && {
        total_gastado: Number(total_gastado) || 0,
      }),
      ...(flag !== undefined && { flag: !!flag }),
    });

    res.json(cli);
  } catch (error) {
    console.error("UPDATE cliente MF error:", error?.original || error);
    res.status(400).json({
      message: "Error al actualizar cliente monkeyfit",
      detail: error?.original?.message || String(error),
    });
  }
};

// ============================
// PUT /api/cliente_mf/delete/:id
// Borrado lógico => flag = 0
// ============================
const deleteClienteMF = async (req = request, res = response) => {
  try {
    const { id } = req.params;

    const cli = await ClienteMonkeyFit.findByPk(id);
    if (!cli)
      return res
        .status(404)
        .json({ message: "Cliente no encontrado (monkeyfit)" });

    await cli.update({ flag: false });
    res.json({ ok: true });
  } catch (error) {
    console.error("DELETE cliente MF error:", error);
    res.status(500).json({
      message: "Error al eliminar (lógico) cliente monkeyfit",
    });
  }
};

// ============================
// OPCIONAL: seed rápido para probar
// ============================
const seedClienteMF = async (_req = request, res = response) => {
  try {
    await db.sync({ alter: true }); // solo en dev

    const row = await ClienteMonkeyFit.create({
      nombre_cli: "Juan",
      apellido_cli: "Probando",
      email_cli: "juan.prueba@example.com",
      telefono_cli: "999888777",
      fecha_primera_reserva: new Date(),
      fecha_ultima_reserva: new Date(),
      total_gastado: 19.0,
      flag: true,
      
    });
console.log("clienteMfApi.list() ->", data);

    res.status(201).json({
      message: "Cliente MF de prueba creado",
      data: row,
    });
  } catch (error) {
    console.error("SEED cliente MF error:", error?.original || error);
    res.status(500).json({
      message: "Error al crear cliente MF de prueba",
      detail: error?.original?.message || String(error),
    });
  }
};

module.exports = {
  listClientesMF,
  getClienteMF,
  createClienteMF,
  updateClienteMF,
  deleteClienteMF,
  seedClienteMF,
};
