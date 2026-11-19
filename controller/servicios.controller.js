const { request, response } = require("express");
const { Comentario, ContactoEmergencia } = require("../models/Modelos");
const uuid = require("uuid");
const { ExtensionMembresia } = require("../models/ExtensionMembresia");
const { Usuario } = require("../models/Usuarios");
const { Sequelize, QueryTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Cliente } = require("../models/Usuarios");
const { ProspectoLead } = require("../models/ProspectoLead");
const { capturarAUDIT } = require("../middlewares/auditoria");
const { typesCRUD } = require("../types/types");

const postComentario = async (req, res) => {
  const { uid_usuario, comentario_com, uid_location, model = "" } = req.body;
  try {
    const comentario = new Comentario({
      uid_usuario,
      comentario_com,
      fec_registro: new Date(),
      uid_location,
      // modulo desde donde se comento (ej. "CRM"); vacio si no se envia
      model,
      uid: uuid.v4(),
    });
    await comentario.save();
    let formAUDIT = {
      id_user: req.id_user,
      ip_user: req.ip_user,
      accion: typesCRUD.POST,
      observacion: `Se agrego: El comentario de id ${comentario.id_comentario}`,
    };
    await capturarAUDIT(formAUDIT);
    res.status(200).json(comentario);
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de programa, hable con el administrador: ${error}`,
    });
  }
};
const getComentarioxLOCATION = async (req = request, res = response) => {
  const { location } = req.params;
  try {
    const comentarios = await Comentario.findAll({
      where: { uid_location: location, flag: true },
      attributes: ["fec_registro", "id_comentario", "comentario_com"],
      order: [["fec_registro", "desc"]],
      include: [
        {
          model: Usuario,
          attributes: [
            [
              Sequelize.fn(
                "CONCAT",
                Sequelize.col("nombres_user"),
                " ",
                Sequelize.col("apellidos_user")
              ),
              "nombres_apellidos_user",
            ],
            "uid",
          ],
        },
      ],
    });
    res.status(200).json({
      comentarios,
      msg: "success",
    });
  } catch (error) {
    console.log(error);
    res.status(200).json({
      msg: `Error hable con el sistemas: getComentarioxLOCATION: ${error}`,
    });
  }
};
const getComentarioxID = async (req = request, res = response) => {
  const { id } = req.params;
  try {
    const comentario = await Comentario.findByPk(id, { flag: true });
    res.status(200).json(comentario);
  } catch (error) {
    res.status(200).json({
      msg: "Error hable con el sistemas: getComentarioxID",
    });
  }
};
const putComentarioxID = async (req = request, res = response) => {
  const { id_comentario } = req.params;
  try {
    const comentario = await Comentario.findByPk(id_comentario, { flag: true });
    if (!comentario) {
      return res.status(404).json({
        msg: `No existe un comentario con el id "${id}"`,
      });
    }
    await comentario.update(req.body);
    let formAUDIT = {
      id_user: req.id_user,
      ip_user: req.ip_user,
      accion: typesCRUD.PUT,
      observacion: `Se actualizo: El comentario de id ${comentario.id_comentario}`,
    };
    await capturarAUDIT(formAUDIT);
    res.status(200).json({
      msg: "success",
    });
  } catch (error) {
    res.status(200).json({
      msg: "Error hable con el sistemas: putComentarioxID",
    });
  }
};
const deleteComentarioxID = async (req = request, res = response) => {
  const { id_comentario } = req.params;
  try {
    const comentario = await Comentario.findByPk(id_comentario, { flag: true });
    if (!comentario) {
      return res.status(404).json({
        msg: `No existe un comentario con el id "${id_comentario}"`,
      });
    }
    await comentario.update({ flag: false });
    let formAUDIT = {
      id_user: req.id_user,
      ip_user: req.ip_user,
      accion: typesCRUD.DELETE,
      observacion: `Se Elimino: El comentario de id ${comentario.id_comentario}`,
    };
    await capturarAUDIT(formAUDIT);
    res.status(200).json({
      msg: "success",
    });
  } catch (error) {
    res.status(200).json({
      msg: "Error hable con el sistemas: deleteComentarioxID",
    });
  }
};

const postCoctactoEmergencia = async (req, res) => {
  const { contactosDeEmergencia, uidLocation } = req.body;
  try {
    for (let id = 0; id < contactosDeEmergencia.length; id++) {
      const element = contactosDeEmergencia[id];
      const contacto = new ContactoEmergencia({
        nombreContacto_ce: element.nombresCompletos_emerg,
        tel_ce: element.tel_emerg,
        relacion_ce: element.relacion_emerg,
        uid: uuid.v4(),
        uid_location: uidLocation,
      });
      console.log(contacto);
      contacto.save();
    }
    // const contacto = new ContactoEmergencia(...contactosDeEmergencia);
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de programa, hable con el administrador: ${error}`,
    });
  }
};
const postExtensionCongelamiento = async (req, res) => {};
const postExtensionRegalo = async (req, res) => {};
const getExtensionesxTIPO = async (req, res) => {};

// Reporte de tareas (CRM): en una sola consulta, los comentarios del mes (hora Peru) de los prospectos (model = 'CRM')
// y los de sus socios vinculados por id_cli (tb_clientes.uid_comentario, model = 'CLIENTE'). Cada fila trae el prospecto y su asesor
const getComentariosCRMxMes = async (req = request, res = response) => {
  const mes = Number(req.query.mes);
  const anio = Number(req.query.anio);
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(anio)) {
    return res.status(400).json({ msg: "mes (1-12) y anio son obligatorios" });
  }
  // 00:00 de Peru (UTC-5) = 05:00 UTC; rango [inicio del mes, inicio del mes siguiente)
  const desde = new Date(Date.UTC(anio, mes - 1, 1, 5));
  const hasta = new Date(Date.UTC(anio, mes, 1, 5));
  const nombreTabla = (modelo) => {
    const t = modelo.getTableName();
    return typeof t === "string" ? `[${t}]` : `[${t.schema}].[${t.tableName}]`;
  };
  const tc = nombreTabla(Comentario);
  const tp = nombreTabla(ProspectoLead);
  const tcli = nombreTabla(Cliente);
  const tu = nombreTabla(Usuario);
  const columnas = `
    c.id_comentario, c.comentario_com, c.fec_registro,
    p.id AS id_prospecto, p.id_empl, p.id_cli, p.nombres, p.apellidos,
    CONCAT(u.nombres_user, ' ', u.apellidos_user) AS nombres_apellidos_user`;
  try {
    const comentarios = await db.query(
      `
      SELECT 'PROSPECTO' AS origen, ${columnas}
      FROM ${tc} c
      INNER JOIN ${tp} p ON p.uid_comentario = c.uid_location AND p.flag = 1
      LEFT JOIN ${tu} u ON u.uid = c.uid_usuario
      WHERE c.flag = 1 AND c.model = 'CRM' AND c.fec_registro >= :desde AND c.fec_registro < :hasta
      UNION ALL
      SELECT 'SOCIO' AS origen, ${columnas}
      FROM ${tc} c
      INNER JOIN ${tcli} cli ON cli.uid_comentario = c.uid_location
      INNER JOIN ${tp} p ON p.id_cli = cli.id_cli AND p.id_cli <> 0 AND p.flag = 1
        AND ISNULL(p.uid_comentario, '') <> cli.uid_comentario
      LEFT JOIN ${tu} u ON u.uid = c.uid_usuario
      WHERE c.flag = 1 AND c.model = 'CLIENTE' AND c.fec_registro >= :desde AND c.fec_registro < :hasta
      ORDER BY fec_registro DESC
      `,
      { replacements: { desde, hasta }, type: QueryTypes.SELECT }
    );
    res.status(200).json({ comentarios, msg: "success" });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: `Error hable con el sistemas: getComentariosCRMxMes: ${error}`,
    });
  }
};

module.exports = {
  postComentario,
  postCoctactoEmergencia,
  postExtensionCongelamiento,
  postExtensionRegalo,
  getExtensionesxTIPO,
  getComentarioxLOCATION,
  getComentarioxID,
  putComentarioxID,
  deleteComentarioxID,
  getComentariosCRMxMes,
};
