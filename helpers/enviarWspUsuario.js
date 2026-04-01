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
      await enviarMensajesWsp(usuario.telefono_user, mensaje);
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
