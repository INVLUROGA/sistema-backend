const { request, response } = require("express");
const { Sequelize } = require("sequelize");
const { HistorialNutricional } = require("../models/HistorialNutricional");

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MEDIDAS = [
  "peso",
  "talla",
  "mme",
  "masa_magra_corporal",
  "tasa_metabolica_basal",
  "relacion_cintura_cadera",
  "nivel_grasa_visceral",
  "grado_obecidad",
];
// DECIMAL(10,2)
const MAXIMO = 99999999.99;

// fecha sale como texto YYYY-MM-DD: leida como Date el driver la corre un dia segun la TZ del servidor
const ATRIBUTOS = [
  "id",
  "id_cli",
  [Sequelize.literal("CONVERT(varchar(10), fecha, 23)"), "fecha"],
  ...MEDIDAS,
];

// Valida el body y arma la fila. Devuelve { error } o { datos }.
// Las medidas son opcionales: vacio o null se guarda como null.
const leerBody = (body) => {
  const { fecha } = body;
  if (!FORMATO_FECHA.test(fecha ?? "")) {
    return { error: "Envia la fecha con formato YYYY-MM-DD" };
  }
  const datos = { fecha };
  for (const campo of MEDIDAS) {
    const valor = body[campo];
    if (valor === undefined || valor === null || valor === "") {
      datos[campo] = null;
      continue;
    }
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < 0 || numero > MAXIMO) {
      return { error: `El campo ${campo} debe ser un numero entre 0 y ${MAXIMO}` };
    }
    datos[campo] = numero;
  }
  return { datos };
};

const errorServidor = (res, error) =>
  res.status(500).json({
    ok: false,
    msg: "Hable con el encargado de sistema",
    error: error.message,
  });

// GET /api/dieta/historial-nutricional/:id_cli
const obtenerHistorialNutricional = async (req = request, res = response) => {
  const id_cli = Number(req.params.id_cli);
  if (!Number.isInteger(id_cli)) {
    return res.status(400).json({ ok: false, msg: "id_cli invalido" });
  }
  try {
    const historialNutricional = await HistorialNutricional.findAll({
      attributes: ATRIBUTOS,
      where: { id_cli, flag: true },
      order: [["fecha", "DESC"], ["id", "DESC"]],
      raw: true,
    });
    res.status(200).json({ historialNutricional });
  } catch (error) {
    errorServidor(res, error);
  }
};

// POST /api/dieta/historial-nutricional/:id_cli
const postHistorialNutricional = async (req = request, res = response) => {
  const id_cli = Number(req.params.id_cli);
  if (!Number.isInteger(id_cli)) {
    return res.status(400).json({ ok: false, msg: "id_cli invalido" });
  }
  const { error, datos } = leerBody(req.body);
  if (error) return res.status(400).json({ ok: false, msg: error });
  try {
    const registro = await HistorialNutricional.create({ ...datos, id_cli, flag: true });
    res.status(201).json({ ok: true, id: registro.id });
  } catch (error) {
    errorServidor(res, error);
  }
};

// PUT /api/dieta/historial-nutricional/:id
// Reemplaza todo el registro: las medidas que no se envian quedan en null.
// Se usa Model.update (no instancia.update): al leer la instancia el driver corre la fecha
// un dia segun la TZ del servidor y Sequelize no detectaba el cambio de fecha.
const putHistorialNutricional = async (req = request, res = response) => {
  const { error, datos } = leerBody(req.body);
  if (error) return res.status(400).json({ ok: false, msg: error });
  try {
    const [actualizados] = await HistorialNutricional.update(datos, {
      where: { id: req.params.id, flag: true },
    });
    if (!actualizados) {
      return res.status(404).json({ ok: false, msg: "Registro no encontrado" });
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    errorServidor(res, error);
  }
};

// DELETE /api/dieta/historial-nutricional/:id (borrado logico: flag = false)
const deleteHistorialNutricional = async (req = request, res = response) => {
  try {
    const [eliminados] = await HistorialNutricional.update(
      { flag: false },
      { where: { id: req.params.id, flag: true } },
    );
    if (!eliminados) {
      return res.status(404).json({ ok: false, msg: "Registro no encontrado" });
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    errorServidor(res, error);
  }
};

// GET /api/dieta/historial-nutricional?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// Evaluaciones de todos los clientes entre dos fechas, con el nombre del cliente (para /status-nutricion).
const obtenerHistorialNutricionalGeneral = async (req = request, res = response) => {
  const { desde, hasta } = req.query;
  if (!FORMATO_FECHA.test(desde ?? "") || !FORMATO_FECHA.test(hasta ?? "")) {
    return res.status(400).json({ ok: false, msg: "Envia desde y hasta con formato YYYY-MM-DD" });
  }
  if (desde > hasta) {
    return res.status(400).json({ ok: false, msg: "La fecha desde no puede ser mayor que hasta" });
  }
  try {
    const [historialNutricional] = await HistorialNutricional.sequelize.query(
      `SELECT h.id, h.id_cli, c.uid AS uid_cli, c.numDoc_cli,
              LTRIM(RTRIM(CONCAT(c.nombre_cli, ' ', c.apPaterno_cli, ' ', c.apMaterno_cli))) AS cliente,
              CONVERT(varchar(10), h.fecha, 23) AS fecha,
              ${MEDIDAS.map((m) => `h.${m}`).join(", ")}
       FROM tb_historial_nutricional h
       LEFT JOIN tb_clientes c ON c.id_cli = h.id_cli
       WHERE h.flag = 1 AND h.fecha BETWEEN :desde AND :hasta
       ORDER BY h.fecha DESC, h.id DESC`,
      { replacements: { desde, hasta } },
    );
    // DECIMAL llega como texto en consultas sin modelo: se pasa a numero
    for (const fila of historialNutricional) {
      for (const m of MEDIDAS) fila[m] = fila[m] === null ? null : Number(fila[m]);
    }
    res.status(200).json({ desde, hasta, historialNutricional });
  } catch (error) {
    errorServidor(res, error);
  }
};

module.exports = {
  obtenerHistorialNutricionalGeneral,
  obtenerHistorialNutricional,
  postHistorialNutricional,
  putHistorialNutricional,
  deleteHistorialNutricional,
};
