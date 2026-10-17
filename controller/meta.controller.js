const { request, response } = require("express");
const { Op } = require("sequelize");
const { Meta, MetaVSAsesor } = require("../models/Meta");
const uid = require("uuid");
const { Empleado } = require("../models/Usuarios");
const { Venta, detalleVenta_membresias } = require("../models/Venta");

// Peru es UTC-5: el mes en hora de Peru empieza el dia 1 a las 05:00 UTC
const OFFSET_PERU_HORAS = 5;

// Monto vendido en membresias por asesor en el mes (mismo criterio que el resumen diario de ventas)
const ventasMembresiaxAsesorEnMes = async (ids_asesor, mes, anio) => {
  if (!ids_asesor.length) return {};
  const membresias = await detalleVenta_membresias.findAll({
    attributes: ["tarifa_monto"],
    include: [
      {
        model: Venta,
        attributes: ["id_empl"],
        where: {
          id_empresa: 598,
          flag: true,
          id_empl: ids_asesor,
          fecha_venta: {
            [Op.gte]: new Date(Date.UTC(anio, mes - 1, 1, OFFSET_PERU_HORAS)),
            [Op.lt]: new Date(Date.UTC(anio, mes, 1, OFFSET_PERU_HORAS)),
          },
        },
        required: true,
      },
    ],
    raw: true,
  });
  return membresias.reduce((acc, m) => {
    const id_empl = m["tb_ventum.id_empl"];
    acc[id_empl] = (acc[id_empl] || 0) + Number(m.tarifa_monto || 0);
    return acc;
  }, {});
};

// La meta es mensual: se guarda el mes en fec_init (dia 1) y fec_final (ultimo dia), en UTC
const rangoDelMes = (mes, anio) => ({
  fec_init: new Date(Date.UTC(anio, mes - 1, 1)),
  fec_final: new Date(Date.UTC(anio, mes, 0)),
});

const validarMeta = ({ meta, bono, mes, anio }) => {
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) return "El mes no es valido";
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) return "El año no es valido";
  if (!(meta > 0)) return "La meta debe ser mayor a 0";
  if (bono < 0) return "El bono no puede ser negativo";
  return null;
};

const leerBodyMeta = (body) => ({
  nombre_meta: (body.nombre_meta || "").trim(),
  meta: Number(body.meta),
  bono: Number(body.bono || 0),
  mes: Number(body.mes),
  anio: Number(body.anio),
  observacion: (body.observacion || "").trim(),
});

const existeMetaDelMes = async (fec_init, id_meta_excluir = 0) => {
  const meta = await Meta.findOne({
    where: {
      flag: true,
      fec_init,
      ...(id_meta_excluir ? { id_meta: { [Op.ne]: id_meta_excluir } } : {}),
    },
  });
  return !!meta;
};

// Agrega a cada meta sus asesores (con nombre) y el total asignado
const agregarAsesores = async (metas) => {
  const ids_meta = metas.map((m) => m.id_meta);
  if (!ids_meta.length) return [];
  const asesores = await MetaVSAsesor.findAll({
    where: { id_meta: ids_meta, flag: true },
    attributes: ["id", "id_meta", "id_asesor", "meta_asesor", "status_meta"],
    raw: true,
  });
  const empleados = await Empleado.findAll({
    where: { id_empl: [...new Set(asesores.map((a) => a.id_asesor))] },
    attributes: ["id_empl", "nombre_empl", "apPaterno_empl", "apMaterno_empl"],
    raw: true,
  });
  const nombres = Object.fromEntries(
    empleados.map((e) => [
      e.id_empl,
      `${e.nombre_empl} ${e.apPaterno_empl} ${e.apMaterno_empl || ""}`.trim(),
    ])
  );
  return metas.map((m) => {
    const fec_init = new Date(m.fec_init);
    const asesoresMeta = asesores
      .filter((a) => a.id_meta === m.id_meta)
      .map((a) => ({
        ...a,
        meta_asesor: Number(a.meta_asesor),
        nombre_asesor: nombres[a.id_asesor] || `ID ${a.id_asesor}`,
      }));
    return {
      ...m,
      meta: Number(m.meta),
      bono: Number(m.bono || 0),
      mes: fec_init.getUTCMonth() + 1,
      anio: fec_init.getUTCFullYear(),
      asesores: asesoresMeta,
      total_asignado: asesoresMeta.reduce((t, a) => t + a.meta_asesor, 0),
    };
  });
};

const atributosMeta = [
  "id_meta",
  "nombre_meta",
  "meta",
  "bono",
  "fec_init",
  "fec_final",
  "observacion",
];

const postMeta = async (req = request, res = response) => {
  const datos = leerBodyMeta(req.body);
  try {
    const error = validarMeta(datos);
    if (error) return res.status(400).json({ ok: false, msg: error });
    const { fec_init, fec_final } = rangoDelMes(datos.mes, datos.anio);
    if (await existeMetaDelMes(fec_init)) {
      return res
        .status(400)
        .json({ ok: false, msg: "Ya existe una meta para ese mes" });
    }
    const metaPOST = await Meta.create({
      nombre_meta: datos.nombre_meta,
      meta: datos.meta,
      bono: datos.bono,
      uid: uid.v4(),
      fec_init,
      fec_final,
      observacion: datos.observacion,
    });
    res.status(200).json({
      ok: true,
      metaPOST,
      msg: "success",
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller(postMeta) de programa, hable con el administrador: ${error}`,
    });
  }
};
const getOneMeta = async (req = request, res = response) => {
  const { id } = req.params;
  try {
    const meta = await Meta.findOne({
      where: { id_meta: id, flag: true },
      attributes: atributosMeta,
      raw: true,
    });
    if (!meta) {
      return res.status(404).json({ ok: false, msg: "La meta no existe" });
    }
    const [metaConAsesores] = await agregarAsesores([meta]);
    res.status(200).json({
      meta: metaConAsesores,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller(getOneMeta) de programa, hable con el administrador: ${error}`,
    });
  }
};
// ?anio=2026 filtra por año; sin anio devuelve todas
const getMetas = async (req, res) => {
  const anio = Number(req.query.anio);
  try {
    const metas = await Meta.findAll({
      where: {
        flag: true,
        ...(anio
          ? {
              fec_init: {
                [Op.gte]: new Date(Date.UTC(anio, 0, 1)),
                [Op.lt]: new Date(Date.UTC(anio + 1, 0, 1)),
              },
            }
          : {}),
      },
      attributes: atributosMeta,
      order: [["fec_init", "DESC"]],
      raw: true,
    });
    res.status(200).json({
      metas: await agregarAsesores(metas),
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller(getMetas) de programa, hable con el administrador: ${error}`,
    });
  }
};
const updateOneMeta = async (req = request, res = response) => {
  const { id } = req.params;
  const datos = leerBodyMeta(req.body);
  try {
    const error = validarMeta(datos);
    if (error) return res.status(400).json({ ok: false, msg: error });
    const meta = await Meta.findOne({ where: { id_meta: id, flag: true } });
    if (!meta) {
      return res.status(404).json({ ok: false, msg: "La meta no existe" });
    }
    const { fec_init, fec_final } = rangoDelMes(datos.mes, datos.anio);
    if (await existeMetaDelMes(fec_init, meta.id_meta)) {
      return res
        .status(400)
        .json({ ok: false, msg: "Ya existe una meta para ese mes" });
    }
    await meta.update({
      nombre_meta: datos.nombre_meta,
      meta: datos.meta,
      bono: datos.bono,
      fec_init,
      fec_final,
      observacion: datos.observacion,
    });
    res.status(200).json({
      ok: true,
      meta,
      msg: "success",
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller(updateOneMeta) de programa, hable con el administrador: ${error}`,
    });
  }
};
// Borrado logico de la meta y de sus metas por asesor
const deleteOneMeta = async (req = request, res = response) => {
  const { id } = req.params;
  try {
    const meta = await Meta.findOne({ where: { id_meta: id, flag: true } });
    if (!meta) {
      return res.status(404).json({ ok: false, msg: "La meta no existe" });
    }
    await meta.update({ flag: false });
    await MetaVSAsesor.update({ flag: false }, { where: { id_meta: id } });
    res.status(200).json({
      ok: true,
      msg: "success",
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller(deleteOneMeta) de programa, hable con el administrador: ${error}`,
    });
  }
};

//META VS ASESOR
// Si el asesor ya tiene meta en esa meta mensual, se actualiza el monto
const postMetaAsesor = async (req = request, res = response) => {
  const { id_meta } = req.params;
  const meta_asesor = Number(req.body.meta_asesor);
  const id_asesor = Number(req.body.id_asesor);
  try {
    if (!id_asesor) {
      return res.status(400).json({ ok: false, msg: "Seleccione un asesor" });
    }
    if (!(meta_asesor > 0)) {
      return res
        .status(400)
        .json({ ok: false, msg: "La meta del asesor debe ser mayor a 0" });
    }
    const metaGeneral = await Meta.findOne({ where: { id_meta, flag: true } });
    if (!metaGeneral) {
      return res.status(404).json({ ok: false, msg: "La meta no existe" });
    }
    const existente = await MetaVSAsesor.findOne({
      where: { id_meta, id_asesor, flag: true },
    });
    const meta = existente
      ? await existente.update({ meta_asesor })
      : await MetaVSAsesor.create({ meta_asesor, id_asesor, id_meta });
    res.status(200).json({
      ok: true,
      meta,
      msg: "success",
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller(postMetaAsesor) de programa, hable con el administrador: ${error}`,
    });
  }
};
const getMetasAsesorxMeta = async (req, res) => {
  const { id_meta } = req.params;
  try {
    const metavsAsesor = await MetaVSAsesor.findAll({
      where: { id_meta: id_meta, flag: true },
      attributes: ["id", "meta_asesor", "id_asesor", "status_meta"],
    });
    res.status(200).json({
      metavsAsesor,
      msg: "success",
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller(getMetaAsesorxMeta) de programa, hable con el administrador: ${error}`,
    });
  }
};
// Ultima meta registrada de cada asesor, con el mes de la meta general
const getUltimaMetaxAsesor = async (req, res) => {
  try {
    const metasAsesor = await MetaVSAsesor.findAll({
      where: { flag: true },
      attributes: ["id", "id_meta", "id_asesor", "meta_asesor", "createdAt"],
      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
      raw: true,
    });
    const metas = await Meta.findAll({
      where: {
        flag: true,
        id_meta: [...new Set(metasAsesor.map((m) => m.id_meta))],
      },
      attributes: atributosMeta,
      raw: true,
    });
    const metasConAsesores = await agregarAsesores(metas);
    const metasxId = new Map(metasConAsesores.map((m) => [m.id_meta, m]));
    const ultimas = new Map();
    for (const ma of metasAsesor) {
      const meta = metasxId.get(ma.id_meta);
      if (!meta || ultimas.has(ma.id_asesor)) continue;
      const asesor = meta.asesores.find((a) => a.id === ma.id);
      ultimas.set(ma.id_asesor, {
        id_asesor: ma.id_asesor,
        nombre_asesor: asesor?.nombre_asesor || `ID ${ma.id_asesor}`,
        meta_asesor: Number(ma.meta_asesor),
        fecha_registro: ma.createdAt,
        id_meta: meta.id_meta,
        nombre_meta: meta.nombre_meta,
        mes: meta.mes,
        anio: meta.anio,
        meta_general: meta.meta,
        bono: meta.bono,
      });
    }
    // Lo vendido por cada asesor en el mes de su ultima meta
    const ultimasMetas = [...ultimas.values()];
    const porMes = new Map();
    for (const u of ultimasMetas) {
      const key = `${u.mes}-${u.anio}`;
      if (!porMes.has(key)) porMes.set(key, { mes: u.mes, anio: u.anio, ids: [] });
      porMes.get(key).ids.push(u.id_asesor);
    }
    for (const { mes, anio, ids } of porMes.values()) {
      const ventas = await ventasMembresiaxAsesorEnMes(ids, mes, anio);
      ultimasMetas
        .filter((u) => u.mes === mes && u.anio === anio)
        .forEach((u) => (u.monto_vendido = ventas[u.id_asesor] || 0));
    }
    res.status(200).json({
      ultimasMetas,
      msg: "success",
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller(getUltimaMetaxAsesor) de programa, hable con el administrador: ${error}`,
    });
  }
};
const deleteOneMetaAsesor = async (req, res) => {
  const { id_meta_asesor } = req.params;
  try {
    const [actualizados] = await MetaVSAsesor.update(
      { flag: false },
      { where: { id: id_meta_asesor, flag: true } }
    );
    if (!actualizados) {
      return res
        .status(404)
        .json({ ok: false, msg: "La meta del asesor no existe" });
    }
    res.status(200).json({
      ok: true,
      msg: "success",
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller(deleteOneMetaAsesor) de programa, hable con el administrador: ${error}`,
    });
  }
};
module.exports = {
  postMeta,
  getOneMeta,
  getMetas,
  updateOneMeta,
  deleteOneMeta,
  getMetasAsesorxMeta,
  getUltimaMetaxAsesor,
  //meta_asesor
  postMetaAsesor,
  deleteOneMetaAsesor,
};
