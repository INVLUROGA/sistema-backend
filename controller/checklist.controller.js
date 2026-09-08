const { request, response } = require("express");
const { Op } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Checklist, ChecklistItem } = require("../models/Checklist");
const { ImagePT } = require("../models/Image");
const { obtenerArticulosActivos } = require("./inventario.controller");

// Las fotos de un item (imagen del articulo re-subida, foto antes, foto despues) se
// guardan con /storage/blob/create/:uid_location?container=checklist-items. Ese endpoint
// NO nombra el blob con el uid: genera un nombre propio (name_image) y solo guarda el uid
// como uid_location en tb_image. Por eso hay que resolver uid_location -> name_image antes
// de poder armar la URL real (CHECKLIST_ITEM + name_image).
const obtenerNombresImagenesPorUids = async (uids) => {
  const uidsUnicos = [...new Set(uids.filter(Boolean))];
  if (!uidsUnicos.length) return {};
  const imagenes = await ImagePT.findAll({
    where: { uid_location: { [Op.in]: uidsUnicos }, flag: true },
    order: [["updatedAt", "desc"]],
  });
  const mapa = {};
  for (const imagen of imagenes) {
    if (!mapa[imagen.uid_location]) {
      mapa[imagen.uid_location] = imagen.name_image;
    }
  }
  return mapa;
};

const formatItem = (item, mapaImagenes = {}) => {
  let opciones = [];
  try {
    opciones = JSON.parse(item.opciones || "[]");
  } catch (error) {
    opciones = [];
  }
  return {
    id: item.id,
    id_checklist: item.id_checklist,
    id_articulo: item.id_articulo,
    producto: item.producto,
    orden: item.orden,
    opciones,
    observacion: item.observacion,
    revisado: !!item.revisado,
    uid_imagen_item: item.uid_imagen_item,
    uid_foto_antes: item.uid_foto_antes,
    uid_foto_despues: item.uid_foto_despues,
    // nombre real del archivo en el container "checklist-items" (o null si aun no se subio nada)
    nombre_imagen_item: mapaImagenes[item.uid_imagen_item] || null,
    nombre_foto_antes: mapaImagenes[item.uid_foto_antes] || null,
    nombre_foto_despues: mapaImagenes[item.uid_foto_despues] || null,
    // foto real del articulo tomada del inventario al crear el checklist (container "avatar-articulos")
    nombre_imagen_inicial: item.nombre_imagen_inicial || null,
  };
};

const formatChecklist = async (checklist, items) => {
  const data = {
    id: checklist.id,
    id_empresa: checklist.id_empresa,
    titulo: checklist.titulo,
    fecha_checklist: checklist.fecha_checklist,
    responsable: checklist.responsable,
    observacion_general: checklist.observacion_general,
    estado: checklist.estado,
  };
  if (items) {
    const uids = items.flatMap((item) => [
      item.uid_imagen_item,
      item.uid_foto_antes,
      item.uid_foto_despues,
    ]);
    const mapaImagenes = await obtenerNombresImagenesPorUids(uids);
    data.items = items.map((item) => formatItem(item, mapaImagenes));
  }
  return data;
};

const crearChecklist = async (req = request, res = response) => {
  const { id_empresa } = req.params;
  const { titulo, fecha_checklist, responsable, observacion_general } = req.body;
  const transaction = await db.transaction();
  try {
    const checklist = await Checklist.create(
      {
        id_empresa,
        titulo,
        fecha_checklist,
        responsable,
        observacion_general,
        estado: "PENDIENTE",
        flag: true,
      },
      { transaction },
    );

    const articulos = await obtenerArticulosActivos(id_empresa, transaction);

    let items = [];
    if (articulos.length) {
      items = await ChecklistItem.bulkCreate(
        articulos.map((articulo) => {
          const imagenesArticulo = [...(articulo.tb_images || [])].sort(
            (a, b) => b.id - a.id,
          );
          return {
            id_checklist: checklist.id,
            id_articulo: articulo.id,
            producto: articulo.producto,
            opciones: "[]",
            observacion: null,
            revisado: false,
            nombre_imagen_inicial: imagenesArticulo[0]?.name_image || null,
            orden: articulo.orden,
            flag: true,
          };
        }),
        { transaction },
      );
    }

    await transaction.commit();

    res.status(201).json({
      ok: true,
      msg: "CHECKLIST REGISTRADO",
      checklist: await formatChecklist(checklist, items),
    });
  } catch (error) {
    await transaction.rollback();
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error al registrar el checklist",
    });
  }
};

const obtenerChecklistsPendientes = async (req = request, res = response) => {
  const { id_empresa } = req.params;
  try {
    const checklists = await Checklist.findAll({
      where: { id_empresa, flag: true, estado: "PENDIENTE" },
      order: [["id", "desc"]],
    });

    res.status(200).json({
      ok: true,
      checklists: await Promise.all(
        checklists.map((checklist) => formatChecklist(checklist)),
      ),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error al obtener los checklist",
    });
  }
};

const obtenerChecklistsHistorial = async (req = request, res = response) => {
  const { id_empresa } = req.params;
  try {
    const checklists = await Checklist.findAll({
      where: { id_empresa, flag: true, estado: "COMPLETADO" },
      order: [["id", "desc"]],
    });

    const idsChecklist = checklists.map((checklist) => checklist.id);
    const items = idsChecklist.length
      ? await ChecklistItem.findAll({
          attributes: ["id_checklist", "revisado"],
          where: { id_checklist: idsChecklist, flag: true },
          raw: true,
        })
      : [];

    const conteosPorChecklist = items.reduce((acc, item) => {
      if (!acc[item.id_checklist]) {
        acc[item.id_checklist] = { total_items: 0, revisados: 0 };
      }
      acc[item.id_checklist].total_items += 1;
      if (item.revisado) {
        acc[item.id_checklist].revisados += 1;
      }
      return acc;
    }, {});

    res.status(200).json({
      ok: true,
      checklists: await Promise.all(
        checklists.map(async (checklist) => {
          const { total_items = 0, revisados = 0 } =
            conteosPorChecklist[checklist.id] || {};
          return {
            ...(await formatChecklist(checklist)),
            total_items,
            revisados,
            no_revisados: total_items - revisados,
          };
        }),
      ),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error al obtener el historial de checklist",
    });
  }
};

const obtenerChecklistPorId = async (req = request, res = response) => {
  const { id } = req.params;
  try {
    const checklist = await Checklist.findOne({
      where: { id, flag: true },
    });

    if (!checklist) {
      return res.status(404).json({
        ok: false,
        msg: "El checklist no existe",
      });
    }

    const items = await ChecklistItem.findAll({
      where: { id_checklist: checklist.id, flag: true },
      order: [
        [db.literal("CASE WHEN orden IS NULL THEN 1 ELSE 0 END"), "ASC"],
        ["orden", "ASC"],
        ["id", "asc"],
      ],
    });

    res.status(200).json({
      ok: true,
      checklist: await formatChecklist(checklist, items),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error al obtener el checklist",
    });
  }
};

const actualizarChecklist = async (req = request, res = response) => {
  const { id } = req.params;
  const { titulo, fecha_checklist, responsable, observacion_general } = req.body;
  try {
    const checklist = await Checklist.findOne({ where: { id, flag: true } });

    if (!checklist) {
      return res.status(404).json({
        ok: false,
        msg: "El checklist no existe",
      });
    }

    await checklist.update({
      titulo,
      fecha_checklist,
      responsable,
      observacion_general,
    });

    res.status(200).json({
      ok: true,
      msg: "CHECKLIST ACTUALIZADO",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error al actualizar el checklist",
    });
  }
};

const completarChecklist = async (req = request, res = response) => {
  const { id } = req.params;
  try {
    const checklist = await Checklist.findOne({ where: { id, flag: true } });

    if (!checklist) {
      return res.status(404).json({
        ok: false,
        msg: "El checklist no existe",
      });
    }

    await checklist.update({ estado: "COMPLETADO" });

    res.status(200).json({
      ok: true,
      msg: "CHECKLIST FINALIZADO",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error al finalizar el checklist",
    });
  }
};

const eliminarChecklist = async (req = request, res = response) => {
  const { id } = req.params;
  try {
    const checklist = await Checklist.findOne({ where: { id, flag: true } });

    if (!checklist) {
      return res.status(404).json({
        ok: false,
        msg: "El checklist no existe",
      });
    }

    await checklist.update({ flag: false });

    res.status(200).json({
      ok: true,
      msg: "CHECKLIST ELIMINADO",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error al eliminar el checklist",
    });
  }
};

module.exports = {
  crearChecklist,
  obtenerChecklistsPendientes,
  obtenerChecklistsHistorial,
  obtenerChecklistPorId,
  actualizarChecklist,
  completarChecklist,
  eliminarChecklist,
  formatItem,
};
