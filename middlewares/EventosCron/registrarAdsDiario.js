const { leadsxDia } = require("../../models/Venta");
const { campaniasMeta } = require("../Redes/CampaniasMeta");

// El server corre en UTC y Perú es UTC-5 todo el año (no tiene horario de
// verano). Para que el resultado no dependa de la TZ configurada en la
// máquina (distinta entre localhost y Azure), "hoy"/"ayer" se calculan
// restando 5h al UTC actual y siempre se leen con los getters getUTC*().
const OFFSET_PERU_MS = 5 * 60 * 60 * 1000;
const obtenerFechaPeru = (fecha = new Date()) =>
  new Date(new Date(fecha).getTime() - OFFSET_PERU_MS);

const ID_RED_META = 1515;
const ID_EMPRESA = 598;

// Registra en tb_leadsDia (lo que lee /api/prospectos-redes) las conversaciones y el gasto
// de Meta de un dia. Sin fecha (YYYY-MM-DD) toma el dia de ayer.
const registrarAdsDiario = async (fechaRegistro) => {
  const hoy = obtenerFechaPeru();
  const ayer = new Date(hoy);
  ayer.setUTCDate(hoy.getUTCDate() - 1);
  const DiaHoy = ayer.getUTCDate();
  const mesHoy = ayer.getUTCMonth() + 1;
  const anioHoy = ayer.getUTCFullYear();
  const fecha =
    fechaRegistro ??
    `${anioHoy}-${mesHoy.toString().padStart(2, "0")}-${DiaHoy.toString().padStart(2, "0")}`;

  const resultadoMeta = await campaniasMeta(fecha, fecha);
  if (!resultadoMeta) {
    console.log(`registrarAdsDiario: no se pudo consultar Meta para ${fecha}`);
    return;
  }
  const {
    conversaciones: conversacionesMeta,
    importeGastado: importeGastoMeta,
  } = resultadoMeta;
  const postData_Meta = {
    id_red: ID_RED_META,
    fecha,
    cantidad: conversacionesMeta,
    monto: importeGastoMeta * 1.18,
    id_empresa: ID_EMPRESA,
    flag: 1,
  };
  try {
    // una sola fila por dia: si el cron corre otra vez (u otro servidor) se actualiza
    const existente = await leadsxDia.findOne({
      where: { id_red: ID_RED_META, id_empresa: ID_EMPRESA, fecha, flag: true },
    });
    if (existente) {
      await existente.update(postData_Meta);
    } else {
      await leadsxDia.create(postData_Meta);
    }
  } catch (error) {
    console.log(`registrarAdsDiario: error al guardar ${fecha}`, error.message);
  }
};

module.exports = {
  registrarAdsDiario,
};
