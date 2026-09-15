const { leadsxDia } = require("../../models/Venta");
const { campaniasMeta } = require("../Redes/Campaniasmeta");

// El server corre en UTC y Perú es UTC-5 todo el año (no tiene horario de
// verano). Para que el resultado no dependa de la TZ configurada en la
// máquina (distinta entre localhost y Azure), "hoy"/"ayer" se calculan
// restando 5h al UTC actual y siempre se leen con los getters getUTC*().
const OFFSET_PERU_MS = 5 * 60 * 60 * 1000;
const obtenerFechaPeru = (fecha = new Date()) =>
  new Date(new Date(fecha).getTime() - OFFSET_PERU_MS);

const registrarAdsDiario = async () => {
  const hoy = obtenerFechaPeru();
  const ayer = new Date(hoy);
  ayer.setUTCDate(hoy.getUTCDate() - 1);
  const DiaHoy = ayer.getUTCDate();
  const mesHoy = ayer.getUTCMonth() + 1;
  const anioHoy = ayer.getUTCFullYear();
  const fecha = `${anioHoy}-${mesHoy.toString().padStart(2, "0")}-${DiaHoy.toString().padStart(2, "0")}`;

  const {
    conversaciones: conversacionesMeta,
    importeGastado: importeGastoMeta,
  } = await campaniasMeta(fecha, fecha);
  const postData_Meta = {
    id_red: 1515,
    fecha,
    cantidad: conversacionesMeta,
    monto: importeGastoMeta * 1.18,
    id_empresa: 598,
    flag: 1,
  };
  const response = await leadsxDia.create(postData_Meta);
};

module.exports = {
  registrarAdsDiario,
};
