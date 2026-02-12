const { request, response } = require("express");
const { AlertasUsuario } = require("../models/Auditoria");
const { Op } = require("sequelize");
const dayjs = require("dayjs"); // Asegúrate de tener dayjs importado
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);
const confirmarPago = async (req = request, res = response) => {
  try {
    const { id } = req.params;

    const alerta = await AlertasUsuario.findOne({ where: { id } });

    if (!alerta) {
      return res.status(404).json({ msg: "Alerta no encontrada" });
    }

    // 1. Marcar la alerta actual como PAGADA (3)
    await alerta.update({ id_estado: 3 });

    // 2. Cancelar otras alertas repetidas de este mes (Tu lógica actual)
    const fechaInicioMes = new Date();
    fechaInicioMes.setDate(1);
    fechaInicioMes.setHours(0, 0, 0, 0);

    const fechaFinMes = new Date(fechaInicioMes);
    fechaFinMes.setMonth(fechaFinMes.getMonth() + 1);

    await AlertasUsuario.update(
      { id_estado: 3 },
      {
        where: {
          id_user: alerta.id_user,
          id_estado: 1,
          flag: true,
          fecha: { [Op.gte]: fechaInicioMes, [Op.lt]: fechaFinMes },
          tipo_alerta: { [Op.in]: [1425] },
          id: { [Op.ne]: id } // Excluir la que ya actualizamos arriba
        }
      }
    );

    // --- AGREGAR ESTO: CREAR LA ALERTA DEL PRÓXIMO MES ---
    if (alerta.tipo_alerta === 1425) { // Solo si es mensual

      // Calculamos la fecha basándonos en la fecha ORIGINAL de la alerta, no en "hoy"
      // para mantener el día de vencimiento (ej: si vence el 15, que el proximo sea el 15)
      const fechaOriginal = new Date(alerta.fecha);
      const horaPeru = dayjs().tz("America/Lima").hour();

      const nuevaFecha = dayjs(fechaOriginal)
        .add(1, 'month')
        .tz("America/Lima")
        .hour(horaPeru === 0 ? 11 : horaPeru) // Mantener hora lógica o default a 11
        .minute(0)
        .second(0)
        .toDate();

      // Verificamos si ya existe para no duplicar (Safety Check)
      const existeProxima = await AlertasUsuario.findOne({
        where: {
          id_user: alerta.id_user,
          tipo_alerta: 1425,
          mensaje: alerta.mensaje,
          fecha: nuevaFecha
        }
      });

      if (!existeProxima) {
        await AlertasUsuario.create({
          id_user: alerta.id_user,
          tipo_alerta: alerta.tipo_alerta,
          mensaje: alerta.mensaje,
          fecha: nuevaFecha,
          id_estado: 1, // Nace activa para que el Cron la tome el otro mes
          flag: true
        });
        console.log("Alerta del próximo mes creada manualmente tras confirmación de pago.");
      }
    }
    // -----------------------------------------------------

    res.status(200).json({ msg: "Pago confirmado, alertas limpiadas y próximo vencimiento programado." });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "ERROR EN LA BASE DE DATOS O SERVIDOR" });
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
