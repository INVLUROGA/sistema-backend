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

    // 2. Cancelar otras alertas repetidas de este mes
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
          mensaje: alerta.mensaje, // <--- ¡CRÍTICO! Solo cancelar recibos del MISMO SERVICIO
          fecha: { [Op.gte]: fechaInicioMes, [Op.lt]: fechaFinMes },
          tipo_alerta: { [Op.in]: [1425] },
          id: { [Op.ne]: id } // Excluir la que ya actualizamos arriba
        }
      }
    );

    // --- 3. CREAR LA ALERTA DEL PRÓXIMO MES ---
    if (alerta.tipo_alerta === 1425) {

      const fechaOriginal = new Date(alerta.fecha);

      // Calculamos la fecha sumando 1 mes exacto, manteniendo la MISMA HORA de la original
      // Esto evita que las alertas salten de las 13:00 a las 11:00 aleatoriamente
      const nuevaFecha = dayjs(fechaOriginal).add(1, 'month').toDate();

      // Definimos el inicio y fin de ese NUEVO DÍA para buscar duplicados
      const inicioDiaNuevo = dayjs(nuevaFecha).startOf('day').toDate();
      const finDiaNuevo = dayjs(nuevaFecha).endOf('day').toDate();

      // Verificamos si ya existe para no duplicar (Safety Check Blindado)
      const existeProxima = await AlertasUsuario.findOne({
        where: {
          id_user: alerta.id_user,
          tipo_alerta: 1425,
          mensaje: alerta.mensaje,
          // Buscamos si existe CUALQUIER alerta ese día (sin importar la hora exacta)
          fecha: { [Op.gte]: inicioDiaNuevo, [Op.lte]: finDiaNuevo },
          // Buscamos en estado 1 (pendiente) o 3 (pagado adelantado)
          id_estado: { [Op.in]: [1, 3] }
        }
      });

      if (!existeProxima) {
        await AlertasUsuario.create({
          id_user: alerta.id_user,
          tipo_alerta: alerta.tipo_alerta,
          mensaje: alerta.mensaje,
          fecha: nuevaFecha,
          id_estado: 1, // Nace activa
          flag: true
        });
        console.log(`Alerta del próximo mes creada para el usuario ${alerta.id_user}: ${alerta.mensaje}`);
      } else {
        console.log(`Se omitió crear alerta. Ya existía una programada para el usuario ${alerta.id_user}.`);
      }
    }

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
