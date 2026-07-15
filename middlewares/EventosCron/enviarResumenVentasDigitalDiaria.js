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
      attributes: ["tarifa_monto", "id_pgm"],
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
const ventasxPrograma = async (
  idsOrigenes = [],
  id_pgm = 0,
  diaAntes = 1,
  diaDespues = 10,
) => {
  const ventasOrigenes = await ventasxOrigen(
    idsOrigenes,
    diaAntes,
    Number(diaDespues),
  );
  const ventasxPgm = await agruparPorPrograma(ventasOrigenes).find(
    (f) => f.id_pgm === id_pgm,
  )?.dias;
  return ventasxPgm;
};
const ventasProgramasMesActual = async (
  idsOrigenes = [],
  id_pgm = 0,
  diaAntes = 1,
  diaDespues = 10,
  mesHoy,
  anioHoy,
) => {
  const ventasRedesxPrograma2MesActual = await ventasxPrograma(
    idsOrigenes,
    id_pgm,
    diaAntes,
    diaDespues,
  );

  return ventasRedesxPrograma2MesActual?.filter(
    (f) => f.mes === mesHoy && f.anio === anioHoy,
  );
};
const enviarResumenVentasDigitalDiaria = async () => {
  const hoy = new Date();
  const hora = hoy.getHours();
  const DiaHoy = hoy.getDate();
  const day = hoy.getDay().toLocaleString("es-PE", { weekday: "long" });
  const mesHoy = hoy.getMonth() + 1;
  const anioHoy = hoy.getFullYear();
  const { conversaciones, costoxResultadoxCampanias, importeGastado } =
    await campaniasMeta(
      `${anioHoy}-${mesHoy}-${1}`,
      `${anioHoy}-${mesHoy}-${DiaHoy}`,
    );
  const ventasMetaH = await ventasxOrigen([694, 693], DiaHoy, DiaHoy);
  const ventasMeta = await ventasxOrigen([694, 693], 1, DiaHoy);
  const ventasRedesxP2MesActual = await ventasProgramasMesActual(
    [694, 693, 695],
    2,
    1,
    DiaHoy,
    mesHoy,
    anioHoy,
  );
  const ventasRedesxP3MesActual = await ventasProgramasMesActual(
    [694, 693, 695],
    3,
    1,
    DiaHoy,
    mesHoy,
    anioHoy,
  );
  const ventasRedesxP4MesActual = await ventasProgramasMesActual(
    [694, 693, 695],
    4,
    1,
    DiaHoy,
    mesHoy,
    anioHoy,
  );

  // TODO: SOLO HOY
  const ventasRedesxP2SoloHoy = await ventasProgramasMesActual(
    [694, 693, 695],
    2,
    DiaHoy,
    DiaHoy,
    mesHoy,
    anioHoy,
  );
  const ventasRedesxP3SoloHoy = await ventasProgramasMesActual(
    [694, 693, 695],
    3,
    DiaHoy,
    DiaHoy,
    mesHoy,
    anioHoy,
  );
  const ventasRedesxP4SoloHoy = await ventasProgramasMesActual(
    [694, 693, 695],
    4,
    DiaHoy,
    DiaHoy,
    mesHoy,
    anioHoy,
  );
  console.log({
    ventasRedesxP2MesActual: JSON.stringify(ventasRedesxP2MesActual, null, 2),
  });

  const ventasTiktok = await ventasxOrigen([695], 1, DiaHoy);
  const ventasRedesFechaActual = await ventasxOrigen(
    [694, 693, 695],
    18,
    DiaHoy,
  );
  const VentasRedesHoy = ventasRedesFechaActual.find(
    (f) => f.mes === mesHoy && f.anio === anioHoy,
  );
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
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ];
  const dia = [
    "LUNES",
    "MARTES",
    "MIÉRCOLES",
    "JUEVES",
    "VIERNES",
    "SÁBADO",
    "DOMINGO",
  ];
  const inversion = importeGastado * 1.18;
  const mensaje = `
📊 *REDES VENTAS  /  ${ventasMetaHoy?.tarifa_monto_total.toLocaleString("es-PE") || 0}*
*${dia[day - 1]?.toUpperCase()} ${DiaHoy} ${meses[mesHoy - 1].toUpperCase()}*
*CUOTA: ${(getQuotaParaMes(mesHoy, anioHoy)?.meta || 0).toLocaleString("es-PE")}*

*1. VENTA HOY: ${(ventasMetaHoy_f?.tarifa_monto_total || 0).toLocaleString("es-PE")} / 0* 
  *%* 0.0
  *CHANGE 45:* ${ventasRedesxP2SoloHoy?.flatMap((f) => f.data)?.length || 0} / ${ventasRedesxP2SoloHoy?.reduce((a, b) => a + b.tarifa_monto_total, 0).toLocaleString("es-PE") || 0}
  *%* 0.0
  *FISIO MUSCLE:* ${ventasRedesxP4SoloHoy?.flatMap((f) => f.data)?.length || 0} / ${ventasRedesxP4SoloHoy?.reduce((a, b) => a + b.tarifa_monto_total, 0).toLocaleString("es-PE") || 0}
  *%* 0.0
  *FS 45:* ${ventasRedesxP3SoloHoy?.flatMap((f) => f.data)?.length || 0} / ${ventasRedesxP3SoloHoy?.reduce((a, b) => a + b.tarifa_monto_total, 0).toLocaleString("es-PE") || 0}
  *%* 0.0

*2. VENTA AL ${DiaHoy}:* ${ventasMetaHoy?.tarifa_monto_total.toLocaleString("es-PE") || 0}
  *CHANGE 45:* ${ventasRedesxP2MesActual?.flatMap((f) => f.data)?.length || 0} / ${ventasRedesxP2MesActual?.reduce((a, b) => a + b.tarifa_monto_total, 0).toLocaleString("es-PE") || 0}
  *%* ${((ventasRedesxP2MesActual?.reduce((a, b) => a + b.tarifa_monto_total, 0) / ventasMetaHoy?.tarifa_monto_total) * 100).toFixed(2) || 0}
  *FISIO MUSCLE:* ${ventasRedesxP4MesActual?.flatMap((f) => f.data)?.length || 0} / ${ventasRedesxP4MesActual?.reduce((a, b) => a + b.tarifa_monto_total, 0).toLocaleString("es-PE") || 0}
  *%* ${((ventasRedesxP4MesActual?.reduce((a, b) => a + b.tarifa_monto_total, 0) / ventasMetaHoy?.tarifa_monto_total) * 100).toFixed(2) || 0}
  *FS 45:* ${ventasRedesxP3MesActual?.flatMap((f) => f.data)?.length || 0} / ${ventasRedesxP3MesActual?.reduce((a, b) => a + b.tarifa_monto_total, 0).toLocaleString("es-PE") || 0}
  *%* ${((ventasRedesxP3MesActual?.reduce((a, b) => a + b.tarifa_monto_total, 0) / ventasMetaHoy?.tarifa_monto_total) * 100).toFixed(2) || 0}

*3. % ALCANCE CUOTA: ${((ventasMetaHoy?.tarifa_monto_total / getQuotaParaMes(mesHoy, anioHoy).meta) * 100).toFixed(2).toLocaleString("es-PE")}%*

*4. META*
  *LEADS:* ${conversaciones || 0}
  *INVERSIÓN:* *$* ${inversion.toFixed(2).toLocaleString("es-PE")} (${Number((inversion * 3.6).toFixed(2)).toLocaleString("es-PE")})
  *COSTO POR LEAD:* ${costoxLead.toFixed(2)}
  *N° DE CIERRES:* ${ventasMetaHoy?.data?.length}
  ⁠*CAC:* *$* ${(inversion / ventasMetaHoy?.data?.length).toFixed(2).toLocaleString("es-PE")} (${((inversion * 3.6) / ventasMetaHoy?.data?.length).toFixed(2).toLocaleString("es-PE")})
  ⁠*ROAS:* ${(ventasMetaHoy?.tarifa_monto_total / (Number(inversion) * 3.73)).toFixed(0).toLocaleString("es-PE")}
  ⁠*CONVERSION:* ${Number(((ventasMetaHoy?.data?.length / conversaciones) * 100).toFixed(2)).toLocaleString("es-PE")}%
    `;
  const idsUsers = [35, 31, 30, 8, 22];
  await enviarWspUsuario(
    mensaje,
    new Date().setMinutes(new Date().getMinutes() + 1),
    idsUsers,
  );
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
function agruparPorPrograma(array) {
  const resultado = {};

  array.forEach((mes) => {
    mes.data.forEach((item) => {
      const id = item.id_pgm;

      if (!resultado[id]) {
        resultado[id] = {
          id_pgm: id,
          data: [],
          dias: [],
        };
      }

      // Agregar venta
      resultado[id].data.push(item);
    });

    mes.dias.forEach((dia) => {
      // Filtrar únicamente las ventas de ese id_pgm
      const ventas = dia.data.filter((item) => item.id_pgm);

      // Agrupar los días por programa
      const programas = {};

      ventas.forEach((item) => {
        if (!programas[item.id_pgm]) {
          programas[item.id_pgm] = [];
        }
        programas[item.id_pgm].push(item);
      });

      Object.entries(programas).forEach(([id, data]) => {
        if (!resultado[id]) {
          resultado[id] = {
            id_pgm: Number(id),
            data: [],
            dias: [],
          };
        }

        resultado[id].dias.push({
          dia: dia.dia,
          mes: dia.mes,
          anio: dia.anio,
          tarifa_monto_total: data.reduce((s, x) => s + x.tarifa_monto, 0),
          data,
        });
      });
    });
  });

  return Object.values(resultado);
}
module.exports = {
  enviarResumenVentasDigitalDiaria,
};
