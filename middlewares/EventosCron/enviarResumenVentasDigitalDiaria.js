const { Op } = require("sequelize");
const { enviarMensajesWsp } = require("../../config/whatssap-web");
const { detalleVenta_membresias, Venta } = require("../../models/Venta");
const { campaniasMeta } = require("../Redes/Campaniasmeta");
const { enviarWspUsuario } = require("../../helpers/enviarWspUsuario");

const getQuotaParaMes = (monthIndex, year) => {
  const y = year;
  const m = monthIndex;
  switch (`${m}-${y}`) {
    case "6-2026":
      return {
        meta: 45000,
      };
    case "5-2026":
      return {
        meta: 45000,
      };
    default:
      return {
        meta: 40000,
      };
  }
};

function agruparPorFecha(arr = []) {
  const map = {};

  arr.forEach((item) => {
    const fecha = new Date(
      new Date(item.tb_ventum.fecha_venta).getTime() - 5 * 60 * 60 * 1000,
    );

    const dia = fecha.getDate();
    const mes = fecha.getMonth() + 1;
    const anio = fecha.getFullYear();

    const key = `${dia}-${mes}-${anio}`;

    if (!map[key]) {
      map[key] = {
        dia,
        mes,
        anio,
        tarifa_monto_total: 0,
        data: [],
      };
    }

    map[key].tarifa_monto_total += item.tarifa_monto || 0;
    map[key].data.push(item);
  });

  return Object.values(map);
}
const obtenerVentasxFecha = async (idsOrigenes = []) => {
  try {
    const membresias = await detalleVenta_membresias.findAll({
      attributes: ["tarifa_monto"],
      include: [
        {
          model: Venta,
          attributes: ["fecha_venta"],
          where: {
            id_empresa: 598,
            flag: true,
            id_origen: {
              [Op.in]: idsOrigenes,
            },
          },
          required: true,
        },
      ],
    });
    const membresiasMAP = membresias.map((a) => a.toJSON());
    return agruparPorFecha(membresiasMAP);
  } catch (error) {
    console.log(error);
  }
};
const obtenerVentasxMes = async (
  idsOrigenes = [],
  diaAntes = 1,
  diaDespues = 30,
) => {
  const obtener = await obtenerVentasxFecha(idsOrigenes);
  const obtenerVentasFiltradas = obtener.filter(
    (f) => f.dia >= diaAntes && f.dia <= diaDespues,
  );

  const ventasxMes = agruparPorMes(obtenerVentasFiltradas);
  return ventasxMes;
};

const ventasxOrigen = async (
  idsOrigenes = [],
  diaAntes = 1,
  diaDespues = 10,
) => {
  const ventas = await obtenerVentasxMes(
    idsOrigenes,
    diaAntes,
    Number(diaDespues),
  );
  const ordenarVentas = ventas.sort(
    (a, b) => b.tarifa_monto_total - a.tarifa_monto_total,
    0,
  );
  return ordenarVentas;
};

const enviarResumenVentasDigitalDiaria = async () => {
  const hoy = new Date();
  const hora = hoy.getHours();
  const DiaHoy = hoy.getDate();
  const mesHoy = hoy.getMonth() + 1;
  const anioHoy = hoy.getFullYear();
  const { conversaciones, costoxResultadoxCampanias, importeGastado } =
    await campaniasMeta(
      `${anioHoy}-${mesHoy}-${1}`,
      `${anioHoy}-${mesHoy}-${DiaHoy}`,
    );
  const ventasMetaH = await ventasxOrigen([694, 693], DiaHoy, DiaHoy);
  const ventasMeta = await ventasxOrigen([694, 693], 1, DiaHoy);
  const ventasTiktok = await ventasxOrigen([695], 1, DiaHoy);
  const ventasRedesFechaActual = await ventasxOrigen(
    [694, 693, 695],
    18,
    DiaHoy,
  );
  const VentasRedesHoy = ventasRedesFechaActual.find(
    (f) => f.mes === mesHoy && f.anio === anioHoy,
  );
  const ventasMetaAdsMejorMes1 = ventasMeta[0];
  const ventasMetaAdsMejorMes2 = ventasMeta[1];
  const ventasMetaAdsMejorMes3 = ventasMeta[2];

  const ventasTikTokHoy = ventasTiktok.find(
    (f) => f.mes === mesHoy && f.anio === anioHoy,
  );
  const ventasMetaHoy_f = ventasMetaH.find(
    (f) => f.mes === mesHoy && f.anio === anioHoy,
  );
  const ventasMetaHoy = ventasMeta.find(
    (f) => f.mes === mesHoy && f.anio === anioHoy,
  );
  const costoxLead = importeGastado / conversaciones;
  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const inversion = importeGastado * 1.18;
  const mensaje = `
📊 *Marketing a la fecha ${DiaHoy} de ${meses[mesHoy - 1]}*

Objetivo: S/.${(getQuotaParaMes(mesHoy, anioHoy)?.meta || 0).toLocaleString("es-PE")}
Venta del 1 hasta ${DiaHoy}: S/. ${(ventasMetaHoy?.tarifa_monto_total || 0).toLocaleString("es-PE")}
% del resultado: ${((ventasMetaHoy?.tarifa_monto_total / getQuotaParaMes(mesHoy, anioHoy).meta) * 100).toFixed(2).toLocaleString("es-PE")}%
Venta hoy: S/. ${(ventasMetaHoy_f?.tarifa_monto_total || 0).toLocaleString("es-PE")}

*META*

1. Venta: ${ventasMetaHoy?.tarifa_monto_total.toLocaleString("es-PE") || 0}
2. ⁠Leads: ${conversaciones || 0}
3. ⁠Inversión: $ ${inversion.toFixed(2).toLocaleString("es-PE")} (S/.${(inversion * 3.73).toFixed(2).toLocaleString("es-PE")})
4. Costo por resultado: ${costoxLead.toFixed(2)}
5. ⁠Número de cierres: ${ventasMetaHoy?.data?.length}
6. ⁠CAC: ${(inversion / ventasMetaHoy?.data?.length).toFixed(2).toLocaleString("es-PE")}
7. ⁠ROAS ${(ventasMetaHoy?.tarifa_monto_total / (Number(inversion) * 3.73)).toFixed(0).toLocaleString("es-PE")}
    `;
  console.log({ventasMetaHoy: JSON.stringify(ventasMetaHoy, null, 2)});
  // const idsUsers = [35, 31, 30, 8, 22];
  // await enviarWspUsuario(
  //   mensaje,
  //   new Date().setMinutes(new Date().getMinutes() + 1),
  //   idsUsers,
  // );
  return true;
};

const agruparPorMes = (arr = []) => {
  const resu = Object.values(
    arr.reduce((acc, item) => {
      const key = `${item.anio}-${item.mes}`;

      if (!acc[key]) {
        acc[key] = {
          mes: item.mes,
          anio: item.anio,
          tarifa_monto_total: 0,
          data: [],
          dias: [],
        };
      }

      acc[key].tarifa_monto_total += item.tarifa_monto_total || 0;
      acc[key].data.push(...(item.data || []));
      acc[key].dias.push(item);

      return acc;
    }, {}),
  );
  return resu;
};
module.exports = {
  enviarResumenVentasDigitalDiaria,
};
