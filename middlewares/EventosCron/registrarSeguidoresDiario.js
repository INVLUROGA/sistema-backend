const { SeguidoresRedes } = require("../../models/SeguidoresRedes");
const { seguidoresMeta } = require("../Redes/SeguidoresMeta");

// Perú es UTC-5 todo el año; se resta al UTC para no depender de la TZ del servidor.
const OFFSET_PERU_MS = 5 * 60 * 60 * 1000;
const fechaHoyPeru = () =>
  new Date(Date.now() - OFFSET_PERU_MS).toISOString().slice(0, 10);

// id_red de tb_parametros (entidad_param "redes-sociales", grupo_param "seguidores")
const ID_RED_FACEBOOK = 2064;
const ID_RED_INSTAGRAM = 2065;

// Guarda en tb_seguidores_redes los seguidores actuales de Facebook e Instagram
// con la fecha de hoy (hora Perú). Una sola fila por red y dia: si ya existe se actualiza.
const registrarSeguidoresDiario = async () => {
  const fecha = fechaHoyPeru();
  let seguidores;
  try {
    seguidores = await seguidoresMeta();
  } catch (error) {
    console.log(
      `registrarSeguidoresDiario: no se pudo consultar Meta para ${fecha}`,
      error.response?.data?.error?.message ?? error.message,
    );
    return;
  }
  const filas = [
    { id_red: ID_RED_FACEBOOK, seguidores: seguidores.facebook },
    { id_red: ID_RED_INSTAGRAM, seguidores: seguidores.instagram },
  ];
  for (const { id_red, seguidores: cantidad } of filas) {
    if (!Number.isInteger(cantidad)) {
      console.log(`registrarSeguidoresDiario: Meta no devolvio seguidores para id_red ${id_red}`);
      continue;
    }
    try {
      const existente = await SeguidoresRedes.findOne({
        where: { id_red, fecha, flag: true },
      });
      if (existente) {
        await existente.update({ seguidores: cantidad });
      } else {
        await SeguidoresRedes.create({ id_red, seguidores: cantidad, fecha, flag: true });
      }
    } catch (error) {
      console.log(`registrarSeguidoresDiario: error al guardar id_red ${id_red}`, error.message);
    }
  }
};

module.exports = {
  registrarSeguidoresDiario,
};
