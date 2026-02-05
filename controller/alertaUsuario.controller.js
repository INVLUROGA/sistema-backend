const { request, response } = require("express");
const { AlertasUsuario } = require("../models/Auditoria");
const { Op } = require("sequelize");

const confirmarPago = async (req = request, res = response) => {
  try {
    const { id } = req.params;

    const alerta = await AlertasUsuario.findOne({ where: { id } });

    if (!alerta) {
      return res.status(404).json({ msg: "Alerta no encontrada" });
    }

    await alerta.update({ id_estado: 3 });

    // 2. Lógica "Confirmación de Pago": Cancelar todas las MENSUALES (1425) futuras del mes
    const fechaInicioMes = new Date();
    fechaInicioMes.setDate(1);
    fechaInicioMes.setHours(0, 0, 0, 0);

    const fechaFinMes = new Date(fechaInicioMes);
    fechaFinMes.setMonth(fechaFinMes.getMonth() + 1);

    await AlertasUsuario.update(
      { id_estado: 3 }, // 3 = Cancelado por pago
      {
        where: {
          id_user: alerta.id_user,
          id_estado: 1, // Solo pendientes
          flag: true,
          fecha: {
            [Op.gte]: fechaInicioMes,
            [Op.lt]: fechaFinMes
          },
          tipo_alerta: { [Op.in]: [1425] } // Solo mensuales
        }
      }
    );

    res.status(200).json({ msg: "Pago confirmado y alertas actualizadas" });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (confirmarPago)",
    });
  }
};

// Crear AlertaUsuario
const PostAlertaUsuario = async (req = request, res = response) => {
  try {
    const alertaUsuario = new AlertasUsuario(req.body);
    await alertaUsuario.save();
    res.status(201).json({ msg: "AlertaUsuario creado correctamente" });
  } catch (error) {
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (PostAlertaUsuario)",
    });
  }
};

// Obtener todos los AlertaUsuarios
const GetAlertaUsuarios = async (req = request, res = response) => {
  try {
    const alertas = await AlertasUsuario.findAll({
      where: { flag: true, id_estado: 1 },
    });
    res.status(200).json({ msg: "AlertaUsuarios obtenidos", alertas });
  } catch (error) {
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (GetAlertaUsuarios)",
    });
  }
};

// Obtener AlertaUsuario por ID
const GetAlertaUsuario = async (req = request, res = response) => {
  try {
    res.status(200).json({ msg: "AlertaUsuario obtenido" });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (GetAlertaUsuario)" });
  }
};

// Eliminar AlertaUsuario
const deleteAlertaUsuario = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const alertaUsuario = await AlertasUsuario.findOne({ where: { id } });
    alertaUsuario.update({ flag: false });
    res.status(200).json({ msg: "AlertaUsuario eliminado correctamente" });
  } catch (error) {
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (deleteAlertaUsuario)",
    });
  }
};

// Actualizar AlertaUsuario
const updateAlertaUsuario = async (req = request, res = response) => {
  try {
    res.status(200).json({ msg: "AlertaUsuario actualizado correctamente" });
  } catch (error) {
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (updateAlertaUsuario)",
    });
  }
};
const updateMensaje = async (req = request, res = response) => {
  try {
    const { mensaje, mensajeAnterior } = req.body;
    const alertasXmensaje = await AlertasUsuario.findAll({
      where: { mensaje: mensajeAnterior, flag: true, id_estado: 1 },
    });
    for (const alerta of alertasXmensaje) {
      await alerta.update({ mensaje });
    }
    res.status(200).json({ msg: "AlertaUsuario actualizado correctamente" });
  } catch (error) {
    res.status(500).json({
      msg: "ERROR EN LA BASE DE DATOS O SERVIDOR (updateAlertaUsuario)",
    });
  }
};
module.exports = {
  PostAlertaUsuario,
  GetAlertaUsuarios,
  GetAlertaUsuario,
  deleteAlertaUsuario,
  updateAlertaUsuario,
  updateMensaje,
  confirmarPago,
};
