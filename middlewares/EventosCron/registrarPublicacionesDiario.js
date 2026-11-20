const { PublicacionesRedes } = require("../../models/PublicacionesRedes");
const {
  publicacionesFacebook,
  publicacionesInstagram,
} = require("../Redes/PublicacionesMeta");

// id_red de tb_parametros (entidad_param "redes-sociales", grupo_param "seguidores")
const ID_RED = { FACEBOOK: 2064, INSTAGRAM: 2065 };

// Guarda en tb_publicaciones_redes las ultimas "cantidad" publicaciones de Facebook e Instagram.
// Una fila por publicacion (id_publicacion): si ya existe se actualizan likes, comentarios, etc.
const registrarPublicacionesDiario = async (cantidad = 50) => {
  const resumen = {};
  for (const [red, obtener] of [
    ["FACEBOOK", publicacionesFacebook],
    ["INSTAGRAM", publicacionesInstagram],
  ]) {
    let publicaciones;
    try {
      publicaciones = await obtener(cantidad);
    } catch (error) {
      console.log(
        `registrarPublicacionesDiario: no se pudo consultar ${red}`,
        error.response?.data?.error?.message ?? error.message,
      );
      continue;
    }
    resumen[red] = { creadas: 0, actualizadas: 0, errores: 0 };
    for (const { red: _red, ...p } of publicaciones) {
      const fila = { ...p, id_red: ID_RED[red], flag: true };
      try {
        const existente = await PublicacionesRedes.findOne({
          where: { id_red: fila.id_red, id_publicacion: fila.id_publicacion, flag: true },
        });
        if (existente) {
          await existente.update(fila);
          resumen[red].actualizadas++;
        } else {
          await PublicacionesRedes.create(fila);
          resumen[red].creadas++;
        }
      } catch (error) {
        resumen[red].errores++;
        console.log(
          `registrarPublicacionesDiario: error al guardar ${fila.id_publicacion}`,
          error.message,
        );
      }
    }
  }
  return resumen;
};

module.exports = {
  registrarPublicacionesDiario,
};
