const { Op, Sequelize } = require("sequelize");
const { Venta, detalleVenta_membresias } = require("../../models/Venta");
const { enviarWspUsuario } = require("../../helpers/enviarWspUsuario");
const { programasIDS } = require("../../types/types");
const { Cliente, Empleado } = require("../../models/Usuarios");
const {
  SemanasTraining,
  ProgramaTraining,
} = require("../../models/ProgramaTraining");
const { ImagePT } = require("../../models/Image");
const { Seguimiento } = require("../../models/Seguimientos");
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
    case "7-2026":
      return {
        meta: 100000,
      };
    case "6-2026":
      return {
        meta: 115000,
      };
    case "5-2026":
      return {
        meta: 100000,
      };
    case "4-2026":
      return {
        meta: 115000,
      };
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
        meta: 100000,
      };
  }
};
const hoy = new Date();
const anioHoy = hoy.getFullYear();
const mesHoy = hoy.getMonth() + 1; // 1-12
const dia = hoy.getDate();

const enviarResumenVentasDiario = async () => {
  const hora = hoy.getHours();
  const fechaHoyMas3Dias = new Date(hoy);
  const ultimoDiasDelMesActual = new Date(
    hoy.getFullYear(),
    hoy.getMonth() + 1,
    0,
  ).getDate();
  const DiaHoy = hoy.getDate();
  const sociosActivos = await obtenerSociosActivos();
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
  const linea = lineaPorMes(ventas, MesHoy, anioHoy, 1, dia);
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
      lenCorte: linea.lenCorte,
      lenTotal: linea.lenTotal,
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
        ...linea,
        lenCorte: linea.lenCorte,
        lenTotal: linea.lenTotal,
        montoTotal: linea.montoPorFechaTotal,
        montoCorte: linea.montoPorFechaCorte,
        mes: a.mes,
        nombreMes: NOMBRES_MESES.find((e) => e.value === a.mes).label,
        anio: a.anio,
      };
    },
  );
  const mesActual = {
    lenCorte: lineaPorMes(ventas, MesHoy, anioHoy, 1, 10).dataFechaCorte_.data
      .length,
    lenTotal: lineaPorMes(ventas, MesHoy, anioHoy, 1, 10).lenTotal,
    montoTotal: lineaPorMes(ventas, MesHoy, anioHoy, 1, 10).montoPorFechaTotal,
    montoCorte: lineaPorMes(ventas, MesHoy, anioHoy, 1, 10).montoPorFechaCorte,
    mes: MesHoy,
    anio: anioHoy,
    nombreMes: NOMBRES_MESES.find((e) => e.value === MesHoy).label,
  };

  const renderTop3 = (
    data = [
      { montoTotal: 0, montoCorte: 0, nombreMes: "", anio: 2026, mes: 1 },
    ],
    isDiaActual = true,
  ) => {
    const sortTotal = data.sort((a, b) => b?.montoTotal - a?.montoTotal);
    const t1 = sortTotal[0];
    const t2 = sortTotal[1];
    const t3 = sortTotal[2];
    return `
*${t1.nombreMes} ${t1.anio}  :*    ${t1.lenCorte}  /  ${t1.montoCorte.toLocaleString("es-PE")} 
${((t1.montoCorte / getQuotaParaMes(t1.mes, t1.anio).meta) * 100).toFixed(2)}%
${`${isDiaActual && `T. MED. PROM.  :    *${Number((t1.montoCorte / t1.lenCorte).toFixed(2)).toLocaleString("es-PE")}*`}`.replace(/false|\r?\n/g, "")}
*${t2.nombreMes} ${t2.anio}  :*    ${t2.lenCorte}  /  ${t2.montoCorte.toLocaleString("es-PE")}
${((t2.montoCorte / getQuotaParaMes(t2.mes, t2.anio).meta) * 100).toFixed(2)}%
${isDiaActual ? `T. MED. PROM.  :    *${Number((t2.montoCorte / t2.lenCorte).toFixed(2)).toLocaleString("es-PE")}*` : "".replace(/false|\r?\n/g, "")}
*${t3.nombreMes} ${t3.anio}  :*    ${t3.lenCorte}  /  ${t3.montoCorte.toLocaleString("es-PE")}
${((t3.montoCorte / getQuotaParaMes(t3.mes, t3.anio).meta) * 100).toFixed(2)}%
${isDiaActual ? `T. MED. PROM.  :    *${Number((t3.montoCorte / t3.lenCorte).toFixed(2)).toLocaleString("es-PE")}*` : "".replace(/false|\r?\n/g, "")}`;
  };

  const renderTop3_1 = (
    data = [
      { montoTotal: 0, montoCorte: 0, nombreMes: "", anio: 2026, mes: 1 },
    ],
    isDiaActual = true,
  ) => {
    const sortTotal = data.sort((a, b) => b?.montoTotal - a?.montoTotal);
    const t1 = sortTotal[0];
    const t2 = sortTotal[1];
    const t3 = sortTotal[2];
    return `
*${t1.nombreMes} ${t1.anio}  :    ${t1.lenCorte}  /  ${t1.montoCorte.toLocaleString("es-PE")}*
${((t1.montoCorte / getQuotaParaMes(t1.mes, t1.anio).meta) * 100).toFixed(2)}%
*${t2.nombreMes} ${t2.anio}  :    ${t2.lenCorte}  /  ${t2.montoCorte.toLocaleString("es-PE")}*
${((t2.montoCorte / getQuotaParaMes(t2.mes, t2.anio).meta) * 100).toFixed(2)}%
*${t3.nombreMes} ${t3.anio}  :    ${t3.lenCorte}  /  ${t3.montoCorte.toLocaleString("es-PE")}*
${((t3.montoCorte / getQuotaParaMes(t3.mes, t3.anio).meta) * 100).toFixed(2)}%`;
  };
  const mensaje = `
*VENTAS / COMPARATIVO*
*CUOTA ${NOMBRES_MESES.find((e) => e.value === MesHoy).label}: ${getQuotaParaMes(MesHoy, anioHoy).meta.toLocaleString("es-PE")}*
 
*1. SOCIOS VIGENTES: ${agruparxUltimaPgm(sociosActivos).reduce((a, b) => a + b.data.length, 0)}*
    ${agruparxUltimaPgm(sociosActivos)
      .map(
        ({ ultimoPgm, data }) =>
          `*${programasIDS.find((f) => f.value === ultimoPgm)?.label}  :*    ${data.length}  /  ${((data.length / agruparxUltimaPgm(sociosActivos).reduce((a, b) => a + b.data.length, 0)) * 100).toFixed(2)}%`,
      )
      .join("\n    ")}

*2. ASESORES*:
    ${agruparxVendedor(linea.dataFechaCorte_.data)
      .map(
        ({ id_empl, monto_total, data }) =>
          `${data[0].tb_ventum.tb_empleado.nombres_apellidos_empl.split(" ")[0]}  :   ${data.length}  /  ${monto_total.toLocaleString("es-PE")}`,
      )
      .join("\n    ")}

*3. VENTAS AL ${nombreDelActualDia.toLocaleUpperCase()} ${DiaHoy}*
${renderTop3(mesesActualesxDiaInicioYDiaActual, true)}
*${mesActual.nombreMes} ${mesActual.anio}  :   ${mesActual.lenCorte}  /  ${mesActual.montoCorte.toLocaleString("es-PE")}*
*${((mesActual.montoCorte / getQuotaParaMes(MesHoy, anioHoy).meta) * 100).toFixed(2)}%*
*T. MED. PROM.  :    ${Number((mesActual.montoCorte / mesActual.lenCorte).toFixed(2)).toLocaleString("es-PE")}*
    
    ${agruparxPgm(linea.dataFechaCorte_.data)
      .map(
        ({ id_empl, monto_total, data }) =>
          `*${programasIDS.find((f) => f.value === data[0].id_pgm).label}  :*   ${data.length}  /  ${monto_total.toLocaleString("es-PE")}
    ${Number((monto_total / mesActual.montoCorte) * 100)
      .toFixed(2)
      .toLocaleString("es-PE")}%
    T. MED.: *${Number((monto_total / data.length).toFixed(2)).toLocaleString("es-PE")}*`,
      )
      .join("\n    ")}


*4. VENTAS AL ${nombreDelActualDiaMas3Dias.toLocaleUpperCase()} ${DiaHoyMas3Dias}*
${renderTop3_1(mesesActualesxDiaInicioYDiaActualmas3Dias, false)}`;
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
    dataFechaCorte_,
    dataFechaCorte,
    dataFechaTotal,
    montoPorFechaCorte: dataFechaCorte_?.tarifa_monto_total || 0,
    montoPorFechaTotal: dataFechaTotal_?.tarifa_monto_total || 0,
    lenCorte: dataFechaCorte_?.data?.length || 0,
    lenTotal: dataFechaTotal_?.data?.length || 0,
  };
};
const obtenerDataxFechaCorte = (data = [], diaInicio = 1, diaFin = 9) => {
  return data.filter((f) => f.dia >= diaInicio && f.dia <= diaFin);
};
const obtenerVentasxFecha = async () => {
  try {
    const membresias = await detalleVenta_membresias.findAll({
      attributes: ["tarifa_monto", "id_pgm"],
      include: [
        {
          model: SemanasTraining,
          attributes: ["semanas_st"],
        },
        {
          model: ImagePT,
          // attributes: ["id", "uid_location", "name_image"],
          as: "contrato_x_serv",
        },
        {
          model: ImagePT,
          // attributes: ["id", "uid_location", "name_image"],
          as: "firma_cli",
          // required: true,
        },
        {
          model: Venta,
          attributes: ["fecha_venta", "id_empl"],
          where: {
            id_empresa: 598,
            flag: true,
          },
          required: true,
          include: [
            {
              model: Cliente,
              attributes: ["fecha_nacimiento", "sexo_cli"],
            },
            {
              model: Empleado,
              attributes: [
                "id_empl",
                "uid_avatar",
                [
                  Sequelize.fn(
                    "CONCAT",
                    Sequelize.col("nombre_empl"),
                    " ",
                    Sequelize.col("apPaterno_empl"),
                    " ",
                    Sequelize.col("apMaterno_empl"),
                  ),
                  "nombres_apellidos_empl",
                ],
              ],
            },
          ],
        },
      ],
    });
    const membresiasMAP = membresias
      .map((a) => a.toJSON())
      .map((m) => {
        return {
          ...m,
          fecha_nacimiento: m.tb_ventum.tb_cliente.fecha_nacimiento,
          fecha_venta: m.tb_ventum.fecha_venta,
          edad: calcularEdad(
            m.tb_ventum.tb_cliente.fecha_nacimiento,
            m.tb_ventum.fecha_venta,
          ),
        };
      });
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

const agruparxPgm = (data = []) => {
  return Object.values(
    data.reduce((acc, item) => {
      const id_pgm = item.id_pgm;

      if (!acc[id_pgm]) {
        acc[id_pgm] = {
          id_pgm: id_pgm,
          orden: programasIDS.find((f) => f.value === id_pgm)?.orden,
          monto_total: 0,
          data: [],
        };
      }

      acc[id_pgm].monto_total += item.tarifa_monto;
      acc[id_pgm].data.push(item);

      return acc;
    }, {}),
  ).sort((a, b) => a.orden - b.orden);
};

const agruparxVendedor = (data = []) => {
  return Object.values(
    data.reduce((acc, item) => {
      const id_empl = item.tb_ventum.id_empl;

      if (!acc[id_empl]) {
        acc[id_empl] = {
          id_empl,
          monto_total: 0,
          data: [],
        };
      }

      acc[id_empl].monto_total += item.tarifa_monto;
      acc[id_empl].data.push(item);

      return acc;
    }, {}),
  );
};
function calcularEdad(fechaNacimiento, fechaReferencia = new Date()) {
  const nacimiento = new Date(fechaNacimiento);
  const referencia = new Date(fechaReferencia);

  let edad = referencia.getFullYear() - nacimiento.getFullYear();

  const mes = referencia.getMonth() - nacimiento.getMonth();

  if (mes < 0 || (mes === 0 && referencia.getDate() < nacimiento.getDate())) {
    edad--;
  }

  return edad;
}

const agruparxUltimaPgm = (data = []) => {
  return Object.values(
    data.reduce((acc, item) => {
      const ultimoPgm = item.ultimoPgm;

      if (!acc[ultimoPgm]) {
        acc[ultimoPgm] = {
          ultimoPgm: ultimoPgm,
          data: [],
        };
      }

      acc[ultimoPgm].data.push(item);

      return acc;
    }, {}),
  );
};
const obtenerSociosActivos = async () => {
  try {
    const dataSeguimiento = await Cliente.findAll({
      attributes: ["id_cli", "nombre_cli", "apPaterno_cli", "apMaterno_cli"],
      include: [
        {
          model: Seguimiento,
          as: "cli_seguimiento",
          where: {
            flag: true,
          },
          order: [["id", "asc"]],
          include: [
            {
              model: detalleVenta_membresias,
              attributes: [
                "tarifa_monto",
                "id_pgm",
                "id",
                "id_venta",
                "fecha_inicio",
                "horario",
              ],
              as: "venta",
              include: [
                {
                  model: Venta,
                  attributes: ["id", "id_cli", "id_origen", "fecha_venta"],
                  required: true,
                  where: {
                    id_empresa: 598,
                  },
                },
                {
                  model: ProgramaTraining,
                  attributes: ["name_pgm"],
                },
              ],
            },
          ],
        },
      ],
    });
    const dataSeguimientoJSON = dataSeguimiento.map((a) => a.toJSON());
    const dataSeguimiento2 = dataSeguimientoJSON.map((m) => {
      const ultimaMembresia = m?.cli_seguimiento.sort(
        (a, b) => b.id_membresia - a.id_membresia,
      )[0];
      const ultimoPrograma =
        ultimaMembresia.venta?.cambio_programa?.length === 0
          ? ultimaMembresia.venta?.tb_ProgramaTraining.name_pgm
          : ultimaMembresia.venta?.cambio_programa?.[0].pgm.name_pgm;
      const ultimoHorario =
        ultimaMembresia.venta?.cambio_programa?.length === 0
          ? ultimaMembresia.venta?.horario
          : ultimaMembresia.venta?.horario;
      return {
        horario: `12:00`,
        nombre_programa: `${ultimoPrograma}`,
        nombres_cli: m.nombre_cli,
        apPaterno_cli: m.apPaterno_cli,
        apMaterno_cli: m.apMaterno_cli,
        nombres_apellidos_cli: `${m.nombre_cli} ${m.apPaterno_cli} ${m.apMaterno_cli}`,
        id_cli: m.id_cli,
        fecha_inicio: ultimaMembresia?.venta?.fecha_inicio,
        ultimoPrograma: ultimoPrograma,
        ultimaMembresia,
        ultimoPgm: ultimaMembresia.venta.id_pgm,
        ...m.cli_seguimiento[0],
        fecha_vencimiento_: ultimaMembresia.fecha_vencimiento,
        fecha_vencimiento: ultimaMembresia.fecha_vencimiento,
      };
    });
    return dataSeguimiento2.filter((f) => {
      const fecha = new Date(f.fecha_vencimiento);
      const fechaActual = new Date(
        `${anioHoy}-${mesHoy.toString().padStart(2, "0")}-${dia.toString().padStart(2, "0")}T12:00:00.000Z`,
      );
      return fecha > fechaActual;
    });
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  enviarResumenVentasDiario,
};
