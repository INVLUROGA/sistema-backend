const { Op } = require("sequelize");
const { Venta, detalleVenta_membresias } = require("../../models/Venta");
const { enviarWspUsuario } = require("../../helpers/enviarWspUsuario");
function obtenerMesesHasta(fechaInicio = "2024-09") {
  const [anioFin, mesFin] = fechaInicio.split("-").map(Number);

  const hoy = new Date();
  let anio = hoy.getFullYear();
  let mes = hoy.getMonth() + 1; // 1-12

  const resultado = [];

  while (anio > anioFin || (anio === anioFin && mes >= mesFin)) {
    resultado.push({ anio, mes });

    mes--;
    if (mes === 0) {
      mes = 12;
      anio--;
    }
  }

  return resultado;
}

const getQuotaParaMes = (monthIndex, year) => {
  const y = year;
  const m = monthIndex;
  switch (`${m}-${y}`) {
    case "3-2026":
      return {
        meta: 100000,
      };
    case "2-2026":
      return {
        meta: 100000,
      };
    case "1-2026":
      return {
        meta: 110000,
      };
    case "12-2025":
      return {
        meta: 90000,
      };

    case "11-2025":
      return {
        meta: 90000,
      };

    case "10-2025":
      return {
        meta: 85000,
      };

    case "9-2025":
      return {
        meta: 75000,
      };

    case "8-2025":
      return {
        meta: 70000,
      };

    case "7-2025":
      return {
        meta: 60000,
      };

    case "6-2025":
      return {
        meta: 60000,
      };

    case "5-2025":
      return {
        meta: 60000,
      };

    case "4-2025":
      return {
        meta: 60000,
      };

    case "3-2025":
      return {
        meta: 60000,
      };

    case "2-2025":
      return {
        meta: 60000,
      };

    case "1-2025":
      return {
        meta: 60000,
      };

    default:
      return {
        meta: 10000,
      };
  }
};
const enviarResumenVentasDiario = async () => {
  const hoy = new Date();
  const hora = hoy.getHours();
  const fechaHoyMas3Dias = new Date(hoy);
  const ultimoDiasDelMesActual = new Date(
    hoy.getFullYear(),
    hoy.getMonth() + 1,
    0,
  ).getDate();
  const DiaHoy = hoy.getDate();

  if (DiaHoy + 3 > ultimoDiasDelMesActual) {
    fechaHoyMas3Dias.setDate(ultimoDiasDelMesActual);
  } else {
    fechaHoyMas3Dias.setDate(hoy.getDate() + 3);
  }
  const DiaHoyMas3Dias = fechaHoyMas3Dias.getDate();
  const MesHoy = hoy.getMonth() + 1;
  const anioHoy = hoy.getFullYear();
  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const nombreDelPrimerDia = primerDia.toLocaleDateString("es-ES", {
    weekday: "long",
  });
  const nombreDelActualDia = hoy.toLocaleDateString("es-ES", {
    weekday: "long",
  });

  const nombreDelActualDiaMas3Dias = fechaHoyMas3Dias.toLocaleDateString(
    "es-ES",
    {
      weekday: "long",
    },
  );

  const ventas = await obtenerVentasxFecha();
  const arrayMeses2024sept = obtenerMesesHasta();
  const NOMBRES_MESES = [
    { label: "ENERO", value: 1 },
    { label: "FEBRERO", value: 2 },
    { label: "MARZO", value: 3 },
    { label: "ABRIL", value: 4 },
    { label: "MAYO", value: 5 },
    { label: "JUNIO", value: 6 },
    { label: "JULIO", value: 7 },
    { label: "AGOSTO", value: 8 },
    { label: "SEPTIEMBRE", value: 9 },
    { label: "OCTUBRE", value: 10 },
    { label: "NOVIEMBRE", value: 11 },
    { label: "DICIEMBRE", value: 12 },
  ];
  const mesesActualesxDiaInicioYDiaActual = arrayMeses2024sept.map((a) => {
    const linea = lineaPorMes(ventas, a.mes, a.anio, 1, DiaHoy);
    return {
      ...linea,
      montoTotal: linea.montoPorFechaTotal,
      montoCorte: linea.montoPorFechaCorte,
      mes: a.mes,
      nombreMes: NOMBRES_MESES.find((e) => e.value === a.mes).label,
      anio: a.anio,
    };
  });
  const mesesActualesxDiaInicioYDiaActualmas3Dias = arrayMeses2024sept.map(
    (a) => {
      const linea = lineaPorMes(ventas, a.mes, a.anio, 1, DiaHoyMas3Dias);
      return {
        montoTotal: linea.montoPorFechaTotal,
        montoCorte: linea.montoPorFechaCorte,
        mes: a.mes,
        nombreMes: NOMBRES_MESES.find((e) => e.value === a.mes).label,
        anio: a.anio,
      };
    },
  );
  const mesActual = {
    montoTotal: lineaPorMes(ventas, MesHoy, anioHoy, 1, DiaHoy)
      .montoPorFechaTotal,
    montoCorte: lineaPorMes(ventas, MesHoy, anioHoy, 1, DiaHoy)
      .montoPorFechaCorte,
    mes: MesHoy,
    anio: anioHoy,
    nombreMes: NOMBRES_MESES.find((e) => e.value === MesHoy).label,
  };

  const renderTop3 = (
    data = [
      { montoTotal: 0, montoCorte: 0, nombreMes: "", anio: 2026, mes: 1 },
    ],
  ) => {
    const sortTotal = data.sort((a, b) => b?.montoTotal - a?.montoTotal);

    const t1 = sortTotal[0];
    const t2 = sortTotal[1];
    const t3 = sortTotal[2];
    return `${t1.nombreMes} ${t1.anio}: ${t1.montoCorte.toLocaleString("es-PE")} /  ${((t1.montoCorte / getQuotaParaMes(t1.mes, t1.anio).meta) * 100).toFixed(2)}%
${t2.nombreMes} ${t2.anio}: ${t2.montoCorte.toLocaleString("es-PE")} /  ${((t2.montoCorte / getQuotaParaMes(t2.mes, t2.anio).meta) * 100).toFixed(2)}%
${t3.nombreMes} ${t3.anio}: ${t3.montoCorte.toLocaleString("es-PE")} /  ${((t3.montoCorte / getQuotaParaMes(t3.mes, t3.anio).meta) * 100).toFixed(2)}%`;
  };
  const mensaje = `
*COMPARATIVO VENTAS*

*CUOTA ${NOMBRES_MESES.find((e) => e.value === MesHoy).label}: ${getQuotaParaMes(MesHoy, anioHoy).meta.toLocaleString("es-PE")}*
% ALCANCE CUOTA: *${((mesActual.montoTotal / getQuotaParaMes(MesHoy, anioHoy).meta) * 100).toFixed(2)}%*


*${nombreDelPrimerDia.toLocaleUpperCase()} 01 - ${nombreDelActualDia.toLocaleUpperCase()} ${DiaHoy}*

${renderTop3(mesesActualesxDiaInicioYDiaActual)}
*${mesActual.nombreMes} ${mesActual.anio}: ${mesActual.montoCorte.toLocaleString("es-PE")} / ${((mesActual.montoCorte / getQuotaParaMes(MesHoy, anioHoy).meta) * 100).toFixed(2)}%*

*${nombreDelPrimerDia.toLocaleUpperCase()} 01 - ${nombreDelActualDiaMas3Dias.toLocaleUpperCase()} ${DiaHoyMas3Dias}*

${renderTop3(mesesActualesxDiaInicioYDiaActualmas3Dias)}
*${mesActual.nombreMes} ${mesActual.anio}: ${mesActual.montoCorte.toLocaleString("es-PE")} / ${((mesActual.montoCorte / getQuotaParaMes(MesHoy, anioHoy).meta) * 100).toFixed(2)}%*`;
  const idsUsers = [35, 31, 30, 8, 22];
  await enviarWspUsuario(
    mensaje,
    new Date().setMinutes(new Date().getMinutes() + 1),
    idsUsers,
  );
  return true;
};

const lineaPorMes = (ventas, mes, anio, diaInicio = 1, diaFin = 9) => {
  const dataFechaCorte = obtenerDataxFechaCorte(ventas, diaInicio, diaFin);
  const dataFechaTotal = obtenerDataxFechaCorte(ventas, 1, 31);
  const dataFechaCorte_ = agruparPorMes(dataFechaCorte).find(
    (e) => e.mes === mes && e.anio === anio,
  );
  const dataFechaTotal_ = agruparPorMes(dataFechaTotal).find(
    (e) => e.mes === mes && e.anio === anio,
  );
  return {
    dataFechaCorte,
    dataFechaTotal,
    montoPorFechaCorte: dataFechaCorte_?.tarifa_monto_total || 0,
    montoPorFechaTotal: dataFechaTotal_?.tarifa_monto_total || 0,
  };
};
const obtenerDataxFechaCorte = (data = [], diaInicio = 1, diaFin = 9) => {
  return data.filter((f) => f.dia >= diaInicio && f.dia <= diaFin);
};
const obtenerVentasxFecha = async () => {
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
  enviarResumenVentasDiario,
};
