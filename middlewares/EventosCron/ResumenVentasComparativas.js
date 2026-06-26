const { Op, Sequelize } = require("sequelize");
const { Venta, detalleVenta_membresias } = require("../../models/Venta");
const { enviarWspUsuario } = require("../../helpers/enviarWspUsuario");
const { Cliente, Empleado } = require("../../models/Usuarios");
const { programasIDS, generosIDS } = require("../../types/types");
const { ImagePT } = require("../../models/Image");
const { Seguimiento } = require("../../models/Seguimientos");
const {
  ProgramaTraining,
  SemanasTraining,
} = require("../../models/ProgramaTraining");
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

const hoy = new Date();
const anio = hoy.getFullYear();
const mes = hoy.getMonth() + 1;
const dia = hoy.getDate();
const enviarReporteVentas = async () => {
  console.log("aaa");

  const ventas = await obtenerVentasxFecha();
  const sociosActivos = await obtenerSociosActivos();
  const linea = lineaPorMes(ventas, mes, anio, 1, dia);
  const ticketMedio = {
    dataLen: linea.dataFechaCorte_.data.length,
    sumaMontoData: linea.montoPorFechaCorte,
  };
  console.log({ linea: JSON.stringify(linea, null, 2) });

  const mensaje = `
  *VENTAS COMPARATIVAS JUNIO*

  *1) SOCIOS VIGENTES*:
   ${agruparxUltimaPgm(sociosActivos)
     .map(
       ({ ultimoPgm, data }) =>
         `${programasIDS.find((f) => f.value === ultimoPgm)?.label}: ${data.length}`,
     )
     .join("\n   ")}
   *TOTAL: ${agruparxUltimaPgm(sociosActivos).reduce((a, b) => a + b.data.length, 0)}*
  
  *2) PROGRAMAS*:
   ${agruparxPgm(linea.dataFechaCorte_.data)
     .map(
       ({ id_empl, monto_total, data }) =>
         `${programasIDS.find((f) => f.value === data[0].id_pgm).label}: ${monto_total.toLocaleString("es-PE")}`,
     )
     .join("\n   ")}
   *TOTAL: ${linea.montoPorFechaCorte.toLocaleString("es-PE")}*
   
  *3) UNIDADES VENDIDAS*: ${ticketMedio.dataLen}

  *4) T. MEDIO*: ${Number((ticketMedio.sumaMontoData / ticketMedio.dataLen).toFixed(2)).toLocaleString("es-PE")}
  
  *5) ASESORES*:
   ${agruparxVendedor(linea.dataFechaCorte_.data)
     .map(
       ({ id_empl, monto_total, data }) =>
         `${data[0].tb_ventum.tb_empleado.nombres_apellidos_empl.split(" ")[0]}: ${monto_total.toLocaleString("es-PE")}`,
     )
     .join("\n   ")}
   *TOTAL: ${linea.montoPorFechaCorte.toLocaleString("es-PE")}*
  
  *6) CONTRATO S/ FIRMAR*: 
   ${agruparxNoFirmadosXpgm(linea.dataFechaCorte_.data)
     .map(
       ({ id_empl, monto_total, data }) =>
         `${programasIDS.find((f) => f.value === data[0].id_pgm).label}: ${data.length}`,
     )
     .join("\n   ")}
   *TOTAL: ${agruparxNoFirmados(linea.dataFechaCorte_.data).length}*

  *7) RANGO EDADES / % GENERO*:
     ${
       agruparxEdad(linea.dataFechaCorte_.data)
         .sort((a, b) => b.monto_total - a.monto_total)
         .map(
           ({ rango_edad, monto_total, data }) =>
             `${rango_edad}: ${monto_total.toLocaleString("es-PE")}
         ${agruparxGenero(data)
           .sort((a, b) => b.sexo_cli - a.sexo_cli)
           .map(
             ({ id_empl, monto_total, data }) =>
               `${generosIDS.find((f) => f.value === data[0].tb_ventum.tb_cliente.sexo_cli).label}: ${((monto_total / linea.montoPorFechaCorte) * 100).toFixed(2).toLocaleString("es-PE")}%`,
           )
           .join("\n         ")}`,
         )[0]
     }
     ${
       agruparxEdad(linea.dataFechaCorte_.data)
         .sort((a, b) => b.monto_total - a.monto_total)
         .map(
           ({ rango_edad, monto_total, data }) =>
             `${rango_edad}: ${monto_total.toLocaleString("es-PE")}
         ${agruparxGenero(data)
           .sort((a, b) => b.sexo_cli - a.sexo_cli)
           .map(
             ({ id_empl, monto_total, data }) =>
               `${generosIDS.find((f) => f.value === data[0].tb_ventum.tb_cliente.sexo_cli).label}: ${((monto_total / linea.montoPorFechaCorte) * 100).toFixed(2).toLocaleString("es-PE")}%`,
           )
           .join("\n         ")}`,
         )[1]
     }
     ${
       agruparxEdad(linea.dataFechaCorte_.data)
         .sort((a, b) => b.monto_total - a.monto_total)
         .map(
           ({ rango_edad, monto_total, data }) =>
             `${rango_edad}: ${monto_total.toLocaleString("es-PE")}
         ${agruparxGenero(data)
           .sort((a, b) => b.sexo_cli - a.sexo_cli)
           .map(
             ({ id_empl, monto_total, data }) =>
               `${generosIDS.find((f) => f.value === data[0].tb_ventum.tb_cliente.sexo_cli).label}: ${((monto_total / linea.montoPorFechaCorte) * 100).toFixed(2).toLocaleString("es-PE")}%`,
           )
           .join("\n         ")}
                    `,
         )[2]
     }
  *8) PROGRAMA / % GENERO*:
     ${agruparxPgm(linea.dataFechaCorte_.data)
       .map(
         (
           g,
         ) => `${programasIDS.find((f) => f.value === g.data[0].id_pgm).label}:
      ${agruparxGenero(g.data)
        .sort((a, b) => b.sexo_cli - a.sexo_cli)
        .map(
          ({ monto_total, data }) =>
            `${generosIDS.find((f) => f.value === data[0].tb_ventum.tb_cliente.sexo_cli).label}: ${((monto_total / g.monto_total) * 100).toFixed(2)}%`,
        )
        .join("\n      ")}`,
       )
       .join("\n    ")}
        
  *9) RANGOS EDADES*:
   ${agruparxPgm(linea.dataFechaCorte_.data)
     .map(
       ({ id_empl, monto_total, data }) =>
         `${programasIDS.find((f) => f.value === data[0].id_pgm).label}: 
         ${
           agruparxEdad(data)
             .sort((a, b) => b.monto_total - a.monto_total)
             .map(
               ({ rango_edad, monto_total, data }) =>
                 `${rango_edad}: ${monto_total.toLocaleString("es-PE")}`,
             )[0]
         }
         ${
           agruparxEdad(data)
             .sort((a, b) => b.monto_total - a.monto_total)
             .map(
               ({ rango_edad, monto_total, data }) =>
                 `${rango_edad}: ${monto_total.toLocaleString("es-PE")}`,
             )[1]
         }
         ${
           agruparxEdad(data)
             .sort((a, b) => b.monto_total - a.monto_total)
             .map(
               ({ rango_edad, monto_total, data }) =>
                 `${rango_edad}: ${monto_total.toLocaleString("es-PE")}`,
             )[2]
         }`,
     )
     .join("\n    ")}

   `;
  console.log({ mensaje });
  const idsUsers = [35, 31, 30, 8, 22];
  await enviarWspUsuario(
    mensaje,
    new Date().setMinutes(new Date().getMinutes() + 1),
    idsUsers,
  );
  return true;
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
        `${anio}-${mes.toString().padStart(2, "0")}-${dia.toString().padStart(2, "0")}T12:00:00.000Z`,
      );
      return fecha > fechaActual;
    });
  } catch (error) {
    console.log(error);
  }
};
const lineaPorMes = (ventas, mes, anio, diaInicio = 1, diaFin = 9) => {
  const dataFechaCorte = obtenerDataxFechaCorte(ventas, diaInicio, diaFin);
  const dataFechaCorte_ = agruparPorMes(dataFechaCorte).find(
    (e) => e.mes === mes && e.anio === anio,
  );
  return {
    dataFechaCorte_,
    montoPorFechaCorte: dataFechaCorte_?.tarifa_monto_total || 0,
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
const rangos = [
  { rango_edad: "56 a más", min: 56, max: Infinity },
  { rango_edad: "52 - 55", min: 52, max: 55 },
  { rango_edad: "48 - 51", min: 48, max: 51 },
  { rango_edad: "44 - 47", min: 44, max: 47 },
  { rango_edad: "40 - 43", min: 40, max: 43 },
  { rango_edad: "36 - 39", min: 36, max: 39 },
  { rango_edad: "32 - 35", min: 32, max: 35 },
  { rango_edad: "28 - 31", min: 28, max: 31 },
  { rango_edad: "24 - 27", min: 24, max: 27 },
  { rango_edad: "20 - 23", min: 20, max: 23 },
  { rango_edad: "16 - 19", min: 16, max: 19 },
  { rango_edad: "12 - 15", min: 12, max: 15 },
  { rango_edad: "0 - 11", min: 0, max: 11 },
];

const agruparxEdad = (data = []) => {
  return Object.values(
    data.reduce((acc, item) => {
      const rango = rangos.find(
        ({ min, max }) => item.edad >= min && item.edad <= max,
      );

      if (!rango) return acc;

      if (!acc[rango.rango_edad]) {
        acc[rango.rango_edad] = {
          rango_edad: rango.rango_edad,
          min: rango.min,
          max: rango.max,
          monto_total: 0,
          data: [],
        };
      }

      acc[rango.rango_edad].monto_total += item.tarifa_monto;
      acc[rango.rango_edad].data.push(item);

      return acc;
    }, {}),
  );
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
const agruparxSemanas = (data = []) => {
  return Object.values(
    data.reduce((acc, item) => {
      const semanas_st = item.tb_semana_training.semanas_st;

      if (!acc[semanas_st]) {
        acc[semanas_st] = {
          semanas_st: semanas_st,
          monto_total: 0,
          data: [],
        };
      }

      acc[semanas_st].monto_total += item.tarifa_monto;
      acc[semanas_st].data.push(item);

      return acc;
    }, {}),
  );
};
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
const agruparxGenero = (data = []) => {
  return Object.values(
    data.reduce((acc, item) => {
      const sexo_cli = item.tb_ventum.tb_cliente.sexo_cli;

      if (!acc[sexo_cli]) {
        acc[sexo_cli] = {
          sexo_cli: sexo_cli,
          monto_total: 0,
          data: [],
        };
      }

      acc[sexo_cli].monto_total += item.tarifa_monto;
      acc[sexo_cli].data.push(item);

      return acc;
    }, {}),
  );
};
const agruparxNoFirmados = (data = []) => {
  const dataSF = data.filter((f) => f.firma_cli === null);
  return data.filter((f) => f.firma_cli === null);
};
const agruparxNoFirmadosXpgm = (data = []) => {
  const dataSF = data.filter((f) => f.firma_cli === null);
  return Object.values(
    dataSF.reduce((acc, item) => {
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
module.exports = {
  enviarReporteVentas,
};
