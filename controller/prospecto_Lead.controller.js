const { request, response } = require("express");
const { ProspectoLead } = require("../models/ProspectoLead");
const { TareaProspecto } = require("../models/TareaProspecto");
const uuid = require("uuid");
const { Empleado } = require("../models/Usuarios");
const { Sequelize, Op, QueryTypes } = require("sequelize");
const { db } = require("../database/sequelizeConnection");
const { Parametros } = require("../models/Parametros");
const { Distritos } = require("../models/Distritos");
const { Comentario } = require("../models/Modelos");
const { Usuario } = require("../models/Usuarios");
const { Cliente } = require("../models/Usuarios");
const { Venta, detalleVenta_membresias } = require("../models/Venta");
const {
  ProgramaTraining,
  SemanasTraining,
  TarifaTraining,
} = require("../models/ProgramaTraining");
const postProspectoLead = async (req = request, res = response) => {
  try {
    const uid = uuid.v4();

    const prospecto = new ProspectoLead({
      ...req.body,
      uid_comentario: uid,
      fecha_registro: req.body.fecha_registro || new Date(),
    });
    await prospecto.save();
    res.status(200).json(prospecto);
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema",
    });
  }
};
const getProspectosLead = async (req = request, res = response) => {
  try {
    const prospectosLeads = await ProspectoLead.findAll({
      where: { flag: true },
      order: [["id", "desc"]],
      include: [
        {
          model: Empleado,
          attributes: [
            [
              Sequelize.fn(
                "CONCAT",
                Sequelize.col("nombre_empl"),
                " ",
                Sequelize.col("apPaterno_empl"),
                " ",
                Sequelize.col("apMaterno_empl"),
              ),
              "nombres_apellidos_empl",
            ],
          ],
          as: "empleado",
        },
        {
          model: Parametros,
          as: "parametro_estado",
        },
        {
          model: Parametros,
          as: "parametro_nivel_interes",
        },
        {
          model: Parametros,
          as: "parametro_canal",
        },
        {
          model: Parametros,
          as: "parametro_medio_comunicacion",
        },
        {
          model: Distritos,
          as: "lead_distrito",
        },
        {
          model: Comentario,
          as: "comentario",
        },
        {
          model: Cliente,
          as: "cliente",
          attributes: [
            "id_cli",
            "uid",
            [
              Sequelize.fn(
                "CONCAT",
                Sequelize.col("cliente.nombre_cli"),
                " ",
                Sequelize.col("cliente.apPaterno_cli"),
                " ",
                Sequelize.col("cliente.apMaterno_cli"),
              ),
              "nombres_apellidos_cli",
            ],
          ],
        },
      ],
    });
    res.status(200).json({
      msg: true,
      prospectosLeads,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema",
    });
  }
};
const getProspectoLeadPorID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(404).json({
        ok: false,
        msg: "No hay id",
      });
    }
    const prospectoLead = await ProspectoLead.findOne({
      where: { flag: true, id: id },
    });
    if (!prospectoLead) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un prospectoLead con el id "${id}"`,
      });
    }
    res.status(200).json({
      prospectoLead,
    });
  } catch (error) {
    res.status(500).json({
      ok: true,
      msg: "Hable con el encargado de sistema",
    });
  }
};
const putProspectoLead = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const prospectoLead = await ProspectoLead.findByPk(id);
    if (!prospectoLead) {
      return res.status(404).json({
        ok: false,
        msg: "No hay ningun prospectoLead con ese id",
      });
    }
    //Si el lead ya tiene asesor, solo lo puede editar el usuario vinculado a ese colaborador
    if (
      prospectoLead.id_empl &&
      prospectoLead.id_empl !== req.id_colaborador
    ) {
      return res.status(403).json({
        ok: false,
        msg: "Este lead pertenece a otro asesor, no puedes editarlo",
      });
    }

    await prospectoLead.update(req.body);
    res.status(200).json({
      prospectoLead,
    });
  } catch (error) {
    res.status(500).json({
      ok: true,
      msg: "Error al eliminar el prospecto. Hable con el encargado de sistema",
      error: error.message,
    });
  }
};
//Revisa si el usuario logueado puede editar el lead (mismo id_empl que su id_colaborador)
const getPuedeEditarProspectoLead = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const prospectoLead = await ProspectoLead.findByPk(id);
    if (!prospectoLead) {
      return res.status(404).json({
        ok: false,
        msg: "No hay ningun prospectoLead con ese id",
      });
    }
    if (
      prospectoLead.id_empl &&
      prospectoLead.id_empl !== req.id_colaborador
    ) {
      return res.status(403).json({
        ok: false,
        msg: "Este lead pertenece a otro asesor, no puedes editarlo",
      });
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Error al validar el lead. Hable con el encargado de sistema",
      error: error.message,
    });
  }
};
const deleteProspectoLead = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const prospectoLead = await ProspectoLead.findByPk(id, { flag: true });
    if (!prospectoLead) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un prospectoLead con el id "${id}"`,
      });
    }
    await prospectoLead.update({ flag: false });
    res.status(200).json({
      prospectoLead,
    });
  } catch (error) {
    res.status(500).json({
      ok: true,
      msg: "Error al eliminar el prospecto. Hable con el encargado de sistema",
      error: error.message,
    });
  }
};
// Registra una tarea sobre el lead; la fecha es la del momento del registro.
const postTareaProspectoLead = async (req = request, res = response) => {
  try {
    const { id_prospecto, id_tarea, observacion } = req.body;
    if (!id_prospecto || !id_tarea) {
      return res.status(400).json({
        ok: false,
        msg: "Faltan id_prospecto o id_tarea",
      });
    }
    const tarea = await TareaProspecto.create({
      id_prospecto,
      id_tarea,
      observacion: observacion || null,
      fecha: new Date(),
    });
    res.status(200).json({ ok: true, tarea });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error al registrar la tarea. Hable con el encargado de sistema",
    });
  }
};
const getTareasProspectoLead = async (req = request, res = response) => {
  try {
    const { id_prospecto } = req.params;
    const tareas = await TareaProspecto.findAll({
      where: { id_prospecto, flag: true },
      order: [["fecha", "desc"]],
    });
    res.status(200).json({ ok: true, tareas });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error al obtener las tareas. Hable con el encargado de sistema",
    });
  }
};
// Todas las tareas activas, para el reporte de tareas por asesor.
const getTareasReporte = async (req = request, res = response) => {
  try {
    const tareas = await TareaProspecto.findAll({
      where: { flag: true },
      order: [["fecha", "desc"]],
    });
    res.status(200).json({ ok: true, tareas });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error al obtener el reporte de tareas. Hable con el encargado de sistema",
    });
  }
};
// Clientes en seguimiento que no estan en prospectos (ni por id_cli ni por celular), sin repetidos:
// uno por DNI y por celular, se queda el de vencimiento mas reciente. Datos de su ultima membresia
const getClientesSinProspecto = async (req = request, res = response) => {
  try {
    const filas = await db.query(
      `WITH seg AS (
         SELECT s.*, ROW_NUMBER() OVER (PARTITION BY s.id_cli ORDER BY s.id_membresia DESC) AS fila,
           (SELECT COUNT(DISTINCT x.id_membresia) FROM tb_seguimientos x
             WHERE x.flag = 1 AND x.id_cli = s.id_cli) AS cantidad_membresias
         FROM tb_seguimientos s WHERE s.flag = 1
       )
       SELECT c.id_cli, c.nombre_cli, c.apPaterno_cli, c.apMaterno_cli, c.numDoc_cli, c.tel_cli, c.email_cli,
         seg.fecha_vencimiento, seg.cantidad_membresias, p.name_pgm, m.tarifa_monto, v.fecha_venta,
         CONCAT(e.nombre_empl, ' ', e.apPaterno_empl, ' ', e.apMaterno_empl) AS vendedor
       FROM seg
       JOIN tb_clientes c ON c.id_cli = seg.id_cli
       LEFT JOIN detalle_ventaMembresia m ON m.id = seg.id_membresia
       LEFT JOIN tb_venta v ON v.id = m.id_venta
       LEFT JOIN tb_ProgramaTraining p ON p.id_pgm = m.id_pgm
       LEFT JOIN tb_empleados e ON e.id_empl = v.id_empl
       WHERE seg.fila = 1
       ORDER BY seg.fecha_vencimiento DESC`,
      { type: QueryTypes.SELECT },
    );
    const leads = await ProspectoLead.findAll({
      where: { flag: true },
      attributes: ["id_cli", "celular"],
      raw: true,
    });
    const cel9 = (cel) => String(cel ?? "").replace(/\D/g, "").slice(-9);
    const cliEnLead = new Set(leads.map((l) => l.id_cli).filter(Boolean));
    const celEnLead = new Set(leads.map((l) => cel9(l.celular)).filter((c) => c.length === 9));
    const vistos = new Set();
    const clientes = [];
    for (const f of filas) {
      const cel = cel9(f.tel_cli);
      const dni = String(f.numDoc_cli ?? "").trim();
      if (cliEnLead.has(f.id_cli) || (cel.length === 9 && celEnLead.has(cel))) continue;
      const claves = [dni && `dni:${dni}`, cel.length === 9 && `cel:${cel}`].filter(Boolean);
      if (claves.some((k) => vistos.has(k))) continue;
      claves.forEach((k) => vistos.add(k));
      clientes.push(f);
    }
    res.status(200).json({ ok: true, clientes });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema",
    });
  }
};
// Estado comercial CONVERTIDO (tb_parametros, comercial / estado)
const ID_ESTADO_CONVERTIDO = 1673;
// Al vender una membresia: si el cliente ya esta como prospecto (por id_cli o por celular) no se crea;
// si no esta, se registra como prospecto nuevo con los datos de la venta y del cliente.
// No lanza error: un problema aqui no debe afectar la venta
const registrarProspectoEnVenta = async (id_venta, id_pgm = 0) => {
  try {
    const venta = await Venta.findByPk(id_venta, {
      attributes: ["id", "id_cli", "id_empl", "fecha_venta"],
    });
    if (!venta?.id_cli) return null;
    const cliente = await Cliente.findOne({
      where: { id_cli: venta.id_cli },
      attributes: [
        "id_cli",
        "nombre_cli",
        "apPaterno_cli",
        "apMaterno_cli",
        "tel_cli",
        "ubigeo_distrito_cli",
      ],
    });
    if (!cliente) return null;
    // celular: solo digitos y ultimos 9 (ignora +51, espacios, guiones)
    const celular = String(cliente.tel_cli ?? "").replace(/\D/g, "").slice(-9);
    const existente = await ProspectoLead.findOne({
      where: {
        flag: true,
        [Op.or]: [
          { id_cli: venta.id_cli },
          ...(celular.length === 9 ? [{ celular: { [Op.like]: `%${celular}` } }] : []),
        ],
      },
      attributes: ["id"],
    });
    if (existente) return null;
    return await ProspectoLead.create({
      uid_comentario: uuid.v4(),
      fecha_registro: venta.fecha_venta || new Date(),
      id_empl: venta.id_empl ?? 0,
      nombres: cliente.nombre_cli ?? "",
      apellidos: [cliente.apPaterno_cli, cliente.apMaterno_cli].filter(Boolean).join(" "),
      celular,
      ubigeo_distrito_residencia: cliente.ubigeo_distrito_cli ?? "",
      id_canal: 0,
      id_medio_comunicacion: 0,
      id_pgm: id_pgm ?? 0,
      id_estado: ID_ESTADO_CONVERTIDO,
      id_nivel_interes: 0,
      observacion: `REGISTRADO AUTOMATICAMENTE POR LA VENTA ${venta.id}`,
      id_cli: venta.id_cli,
    });
  } catch (error) {
    console.log("Error en registrarProspectoEnVenta:", error);
    return null;
  }
};
// Comentarios de los leads vinculados al cliente (id_cli). No se copian al cliente:
// se buscan por el uid_comentario de cada lead; cada comentario lleva el id del lead
const getComentariosClienteLead = async (req = request, res = response) => {
  try {
    const { id_cli } = req.params;
    if (!Number(id_cli)) {
      return res.status(200).json({ ok: true, comentarios: [] });
    }
    const leads = await ProspectoLead.findAll({
      where: { id_cli, flag: true },
      attributes: ["id", "uid_comentario"],
      raw: true,
    });
    const idLeadxUid = new Map(leads.map((l) => [l.uid_comentario, l.id]));
    if (!idLeadxUid.size) {
      return res.status(200).json({ ok: true, comentarios: [] });
    }
    const comentarios = await Comentario.findAll({
      where: { uid_location: [...idLeadxUid.keys()], flag: true },
      attributes: ["fec_registro", "id_comentario", "comentario_com", "uid_location"],
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
                Sequelize.col("apellidos_user"),
              ),
              "nombres_apellidos_user",
            ],
            "uid",
          ],
        },
      ],
    });
    res.status(200).json({
      ok: true,
      comentarios: comentarios.map((c) => ({
        ...c.toJSON(),
        id_prospecto: idLeadxUid.get(c.uid_location),
      })),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el encargado de sistema",
    });
  }
};
// Membresías compradas por el cliente vinculado al lead (id_cli).
const getMembresiasClienteLead = async (req = request, res = response) => {
  try {
    const { id_cli } = req.params;
    if (!Number(id_cli)) {
      return res.status(200).json({ ok: true, membresias: [] });
    }
    const membresias = await detalleVenta_membresias.findAll({
      where: { flag: true },
      attributes: ["id", "fec_inicio_mem", "fec_fin_mem", "tarifa_monto"],
      include: [
        {
          model: Venta,
          required: true,
          where: { id_cli, flag: true },
          attributes: ["id", "fecha_venta"],
          include: [
            {
              model: Empleado,
              attributes: [
                [
                  Sequelize.fn(
                    "CONCAT",
                    Sequelize.col("tb_ventum->tb_empleado.nombre_empl"),
                    " ",
                    Sequelize.col("tb_ventum->tb_empleado.apPaterno_empl"),
                    " ",
                    Sequelize.col("tb_ventum->tb_empleado.apMaterno_empl"),
                  ),
                  "nombres_apellidos_empl",
                ],
              ],
            },
          ],
        },
        {
          model: ProgramaTraining,
          attributes: ["name_pgm"],
        },
        {
          model: SemanasTraining,
          attributes: ["semanas_st"],
        },
        {
          model: TarifaTraining,
          as: "tarifa_venta",
          attributes: ["nombreTarifa_tt"],
        },
      ],
      order: [[Venta, "fecha_venta", "desc"]],
    });
    res.status(200).json({ ok: true, membresias });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error al obtener las membresias del cliente. Hable con el encargado de sistema",
    });
  }
};
module.exports = {
  getClientesSinProspecto,
  registrarProspectoEnVenta,
  getComentariosClienteLead,
  getPuedeEditarProspectoLead,
  getMembresiasClienteLead,
  getTareasReporte,
  postProspectoLead,
  getProspectosLead,
  getProspectoLeadPorID,
  putProspectoLead,
  deleteProspectoLead,
  postTareaProspectoLead,
  getTareasProspectoLead,
};
