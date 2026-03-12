const { AlertasUsuario } = require("../models/Auditoria");
const { Usuario } = require("../models/Usuarios");

const enviarWspUsuario = async (mensaje, fecha) => {
  try {
    const usuarios = await Usuario.findAll({
      where: {
        estado_user: true,
        flag: true,
      },
    });

    for (const usuario of usuarios) {
      await AlertasUsuario.create({
        id_user: usuario.id_user,
        tipo_alerta: 1428,
        mensaje: mensaje,
        fecha: fecha,
        id_estado: 1,
        flag: true,
      });
      console.log(
        `[enviarWspUsuario] ✅ Alerta registrada para user ${id_user} en tb_alertaUsuarios.`,
      );
    }
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  enviarWspUsuario,
};
