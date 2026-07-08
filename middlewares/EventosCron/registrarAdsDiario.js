const { leadsxDia } = require("../../models/Venta");
const { campaniasMeta } = require("../Redes/Campaniasmeta");
const hoy = new Date();
const ayer = new Date(hoy);
ayer.setDate(hoy.getDate() - 1);
const hora = ayer.getHours();
const DiaHoy = ayer.getDate();
const mesHoy = ayer.getMonth() + 1;
const anioHoy = ayer.getFullYear();
const registrarAdsDiario = async () => {
  const {
    conversaciones: conversacionesMeta,
    importeGastado: importeGastoMeta,
  } = await campaniasMeta(
    `${anioHoy}-${mesHoy}-${DiaHoy}`,
    `${anioHoy}-${mesHoy}-${DiaHoy}`,
  );
  const postData_Meta = {
    id_red: 1515,
    fecha: `${anioHoy}-${mesHoy}-${DiaHoy}`,
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
