const { Op } = require("sequelize");
const { AlertasUsuario } = require("../models/Auditoria");
const { Usuario } = require("../models/Usuarios");
const { enviarMensajesWsp } = require("../config/whatssap-web");

const enviarWspUsuario = async (mensaje, fecha, idsUsers) => {
  try {
    const usuarios = await Usuario.findAll({
      where: {
        estado_user: true,
        flag: true,
        id_user: {
          [Op.in]: idsUsers,
        },
      },
    });

    for (const usuario of usuarios) {
      // 4. Enviamos UN SOLO mensaje
      await enviarMensajesWsp(usuario.telefono_user, mensaje);
      // await AlertasUsuario.create({
      //   id_user: usuario.id_user,
      //   tipo_alerta: 1428,
      //   mensaje: mensaje,
      //   fecha: fecha,
      //   id_estado: 1,
      //   flag: true,
      // });
      console.log(
        `[enviarWspUsuario] ✅ Alerta registrada para user ${usuario.id_user} en tb_alertaUsuarios.`,
      );
    }
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  enviarWspUsuario,
};
