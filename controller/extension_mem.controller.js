const { request, response } = require("express");
const { ExtensionMembresia } = require("../models/ExtensionMembresia");
const { Seguimiento } = require("../models/Seguimientos");
const { detalleVenta_membresias } = require("../models/Venta");
const { SemanasTraining } = require("../models/ProgramaTraining");
const {
  obtenerDataSeguimientoPorVenta,
} = require("../middlewares/EventosCron/obtenerDataSeguimientos");
const { Cliente } = require("../models/Usuarios");
const { enviarMensajesWsp } = require("../config/whatssap-web");
const dayjs = require("dayjs");
require("dayjs/locale/es");
dayjs.locale("es");

const obtenerExtensionesPorTipo = async (req = request, res = response) => {
  const { tipo } = req.params;

  try {
    const extensiones = await ExtensionMembresia.findAll({
      where: { tipo_extension: tipo },
      order: [["id", "DESC"]],
      attributes: [
        "id",
        "tipo_extension",
        "extension_inicio",
        "extension_fin",
        "observacion",
        "dias_habiles",
      ],
    });
    res.status(200).json({
      extensiones,
    });
  } catch (error) {
    console.log(error);
    res.status(505).json({
      msg: `Problemas en obtenerExtensionesPorTipo: ${error}`,
    });
  }
};
// extension_inicio/extension_fin son strings "YYYY-MM-DD": se usa solo la
// fecha para no correr un dia por la zona horaria. Ej: "lunes 06/10/2026".
const formatearFechaExtension = (valor) => {
  const match = String(valor || "").match(/^(\d{4}-\d{2}-\d{2})/);
  const fecha = dayjs(match ? match[1] : valor);
  return fecha.isValid() ? fecha.format("dddd DD/MM/YYYY") : "";
};

// Envia al cliente el WhatsApp del congelamiento con los dias de freeze del
// plan (congelamiento_st) menos los usados (dias_congelamientos_usados del
// seguimiento ya recalculado).
const logDiasFreeze = async (idVenta, extension) => {
  try {
    const membresia = await detalleVenta_membresias.findOne({
      where: { id_venta: idVenta },
      attributes: ["id", "id_st"],
      include: [{ model: SemanasTraining, attributes: ["congelamiento_st"] }],
    });
    if (!membresia) return;
    const seguimiento = await Seguimiento.findOne({
      where: { id_membresia: membresia.id },
      attributes: ["id_cli", "dias_congelamientos_usados"],
    });
    const disponibles = membresia.tb_semana_training?.congelamiento_st ?? 0;
    const usados = seguimiento?.dias_congelamientos_usados ?? 0;
    const restantes = Math.max(disponibles - usados, 0);
    console.log(
      `El cliente tiene disponible ${disponibles} dias de freeze, y uso ${usados} dias`,
    );

    // id_cli del seguimiento: si la membresia fue transferida, es el cliente actual
    const cliente = seguimiento
      ? await Cliente.findOne({
          where: { id_cli: seguimiento.id_cli },
          attributes: ["tel_cli"],
        })
      : null;
    if (!cliente?.tel_cli) {
      console.log(`Venta ${idVenta}: el cliente no tiene telefono, no se envia el WhatsApp de congelamiento`);
      return;
    }
    await enviarMensajesWsp(
      cliente.tel_cli,
      `❄️ ¡LISTO! Tu congelamiento fue registrado.

Del ${formatearFechaExtension(extension.extension_inicio)} al ${formatearFechaExtension(extension.extension_fin)}

Te quedan ${restantes} sesiones de congelamiento disponibles.

Tu membresía queda protegida durante este periodo. En este periodo tu huella quedará inactiva. Nos vemos a tu regreso. 💪`,
    );
  } catch (error) {
    console.log(error);
  }
};
const postExtensionPorTipoPorId = async (req = request, res = response) => {
  const { tipo, idventa } = req.params;
  const { observacion, dias_habiles, extension_inicio, extension_fin } =
    req.body;
  try {
    const extension = new ExtensionMembresia({
      tipo_extension: tipo,
      dias_habiles,
      observacion,
      extension_inicio,
      extension_fin,
      id_venta: idventa,
    });
    await extension.save();
    // recalcula el seguimiento de la venta (fecha_vencimiento y dias_congelamientos_usados)
    await obtenerDataSeguimientoPorVenta(idventa);
    if (tipo === "CON") {
      await logDiasFreeze(idventa, extension);
    }
    res.status(200).json({
      msg: `Extension agregado con exito`,
    });
  } catch (error) {
    console.log(error);
    res.status(505).json({
      msg: `Problemas en obtenerExtensionesPorTipo: ${error}`,
    });
  }
};

const obtenerExtensionPorId = (req = request, res = response) => {};
const putExtension = async (req = request, res = response) => {
  const { id } = req.params;
  const { observacion, dias_habiles, extension_inicio, extension_fin, flag } =
    req.body;
  try {
    const extension = await ExtensionMembresia.findByPk(id);
    if (!extension) {
      return res.status(404).json({
        msg: `No existe la extension con id ${id}`,
      });
    }
    const campos = {
      observacion,
      dias_habiles,
      extension_inicio,
      extension_fin,
      flag,
    };
    // solo actualiza los campos enviados
    Object.keys(campos).forEach(
      (key) => campos[key] === undefined && delete campos[key],
    );
    await extension.update(campos);
    await obtenerDataSeguimientoPorVenta(extension.id_venta);
    res.status(200).json({
      msg: `Extension actualizada con exito`,
    });
  } catch (error) {
    console.log(error);
    res.status(505).json({
      msg: `Problemas en putExtension: ${error}`,
    });
  }
};
const removeExtension = (req = request, res = response) => {};

module.exports = {
  obtenerExtensionesPorTipo,
  postExtensionPorTipoPorId,
  obtenerExtensionPorId,
  putExtension,
  removeExtension,
};
