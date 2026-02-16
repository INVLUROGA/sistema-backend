const { request, response } = require("express");
const {
  Parametros,
  Parametros_3,
  Parametro_periodo,
  Parametros_zonas,
} = require("../models/Parametros");
const { Proveedor } = require("../models/Proveedor");
const { Cliente, Empleado } = require("../models/Usuarios");
const { Sequelize, where } = require("sequelize");
const { Producto } = require("../models/Producto");
const {
  ProgramaTraining,
  SemanasTraining,
  TarifaTraining,
} = require("../models/ProgramaTraining");
const { ImagePT } = require("../models/Image");
const { HorarioProgramaPT } = require("../models/HorarioProgramaPT");
const { MetaVSAsesor } = require("../models/Meta");
const { FormaPago } = require("../models/Forma_Pago");
const { Cita, CitasAdquiridas } = require("../models/Cita");
const {
  detalleVenta_citas,
  Venta,
  detalleVenta_membresias,
} = require("../models/Venta");
const { Servicios } = require("../models/Servicios");
const { ParametroGastos, ParametroGrupo } = require("../models/GastosFyV");
const { Inversionista } = require("../models/Ingresos");
const { ExtensionMembresia } = require("../models/ExtensionMembresia");
const { Distritos } = require("../models/Distritos");
const { ServiciosCircus } = require("../models/modelsCircus/Servicios");
const { get } = require("../config/nodemailer");
const { Op } = require("sequelize");
const parseDateOnly = (s) => {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
};
const getInicioBase = (m) => {
  // 1) usa fec_inicio_mem si existe
  let inicio =
    parseDateOnly(m?.fec_inicio_mem) ||
    // 2) si no, usa fecha_venta como inicio
    (m?.tb_ventum?.fecha_venta ? new Date(m.tb_ventum.fecha_venta) : null);

  if (!inicio || isNaN(inicio)) return null;
  inicio.setHours(0, 0, 0, 0);
  return inicio;
};

function addBusinessDays(startDate, numberOfDays) {
  let currentDate = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < numberOfDays) {
    currentDate.setDate(currentDate.getDate() + 1);

    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // Check if it's Monday to Friday
      daysAdded++;
    }
  }

  return currentDate;
}
const isActiveFlag = (v) => v === 1 || v === true || v === "1" || v === "true";

// 1. La función que fuerza el cálculo matemático
const getFinBaseFromSemanas = (m) => {
  // Ajusta 'tb_semanas_training' si tu alias en el backend es diferente
  const st = m?.tb_semanas_training || m?.SemanasTraining;

  if (!st?.semanas_st) return null;

  const semanas = parseInt(st.semanas_st, 10);
  const inicio = parseDateOnly(m?.fec_inicio_mem);

  if (!inicio || !semanas) return null;

  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + (semanas * 7)); // Magia: 12 * 7 = 84 días agregados
  return fin;
};

// 2. Tu función orquestadora (Esta ya la tienes bien)
const getFinBase = (m) =>
  getFinBaseFromSemanas(m) ||          // Prioridad 1: Cálculo matemático (Arregla tu error)
  parseDateOnly(m?.fec_fin_mem) ||     // Prioridad 2: Fecha guardada (Fallback)
  parseDateOnly(m?.fec_fin_mem_oftime) ||
  parseDateOnly(m?.fec_fin_mem_viejo);
const calcFinEfectivo = (m) => {

  const base = getFinBase(m);

  if (!base) return null;

  const ext = Array.isArray(m.tb_extension_membresia)

    ? m.tb_extension_membresia

    : [];

  const diasHab = ext.reduce(

    (acc, e) => acc + parseInt(e?.dias_habiles ?? 0, 10),

    0,

  );

  return diasHab > 0 ? addBusinessDays(base, diasHab) : base;

};
const obtenerEmpleadosxCargoxDepartamentoxEmpresa = async (
  req = request,
  res = response,
) => {
  try {
    const { id_cargo, id_empresa, id_departamento } = req.params;
    const empleados = await Empleado.findAll({
      where: {
        departamento_empl: id_departamento,
        id_empresa,
        cargo_empl: id_cargo,
        flag: true,
        estado_empl: true,
      },
      attributes: [
        ["id_empl", "value"],
        [
          Sequelize.literal(
            "CONCAT(nombre_empl, ' ', apPaterno_empl, ' ', apMaterno_empl)",
          ),
          "label",
        ],
      ],
    });
    res.status(200).json(empleados);
  } catch (error) {
    res.status(501).json(error);
  }
};

const obtenerDistritosxDepartamentoxProvincia = async (
  req = request,
  res = response,
) => {
  try {
    const { id_provincia, department_id } = req.params;
    if (id_provincia == 0 && department_id == 0) {
      const departamentos = await Distritos.findAll({
        where: {
          flag: true,
        },
        attributes: [
          ["ubigeo", "value"],
          ["distrito", "label"],
        ],
      });
      res.status(200).json(departamentos);
    } else {
      const departamentos = await Distritos.findAll({
        where: {
          provincia_id: id_provincia,
          department_id: department_id,
          flag: true,
        },
        attributes: [
          ["ubigeo", "value"],
          ["distrito", "label"],
        ],
      });
      res.status(200).json(departamentos);
    }
  } catch (error) {
    console.log(error);

    res.status(501).json(error);
  }
};

const getParametrosTipoAportes = async (req = request, res = response) => {
  try {
  } catch (error) {
    console.log(error);
  }
};
const getParametrosporId = async (req = request, res = response) => {
  const { id_param } = req.params;
  try {
    const parametro = await Parametros.findOne({
      where: { id_param: id_param },
    });
    if (!parametro) {
      return res.status(200).json({ msg: "nohay" });
    }
    return res.status(200).json(parametro);
  } catch (error) {
    res.status(505).json(error);
  }
};
const getParametrosxEntidadxGrupo = async (req = request, res = response) => {
  const { } = req.params;
  try {
    const parametros = await Parametros.findAll({ where: { flag: true } });
    return res.status(200).json(parametros);
  } catch (error) {
    res.status(505).json(error);
  }
};
const getParametros = async (req = request, res = response) => {
  try {
    const parametros = await Parametros.findAll({ where: { flag: true } });
    return res.status(200).json(parametros);
  } catch (error) {
    res.status(505).json(error);
  }
};
const getCitasDisponibleporClient = async (req = request, res = response) => {
  try {
    const { id_cli, tipo_serv } = req.params;
    // Obtener las citas disponibles desde la tabla tb_detallecita
    const CITASCOMPRADAS = await Venta.findAll({
      raw: true,
      where: { flag: true, id_cli: id_cli },
      attributes: ["id", "id_cli"],
      include: [
        {
          model: detalleVenta_citas,
          attributes: ["cantidad", "id"],
          required: true,
          include: [
            {
              model: Servicios,
              attributes: ["id", "nombre_servicio"],
              where: { flag: true, tipo_servicio: tipo_serv },
            },
          ],
        },
      ],
    });
    console.log(tipo_serv);

    // Obtener las citas programadas desde la tabla tb_citas
    const citasYaProgramadas = await Cita.findAll({
      where: { id_cli: id_cli },
      attributes: [],
      raw: true,
    });

    // Crear un mapa para contar las citas programadas por cada detalleCita
    // Crear un mapa para contar las citas programadas por cada id_detallecita
    const citasProgramadasMap = citasYaProgramadas.reduce((acc, cita) => {
      acc[cita.id_detallecita] = (acc[cita.id_detallecita] || 0) + 1;
      return acc;
    }, {});

    // Calcular las citas disponibles
    // Calcular las citas disponibles y filtrar las que tienen cantidad <= 0
    const citasDisponibles = CITASCOMPRADAS.map((compra) => {
      const idDetalleCita = compra["detalle_ventaCitas.id"];
      const cantidadComprada = compra["detalle_ventaCitas.cantidad"];
      const cantidadProgramada = citasProgramadasMap[idDetalleCita] || 0;
      const cantidadDisponible = cantidadComprada - cantidadProgramada;

      if (cantidadDisponible > 0) {
        return {
          label: `${compra["detalle_ventaCitas.tb_servicio.nombre_servicio"]} | CANTIDAD: ${cantidadDisponible}`,
          cantidad: cantidadDisponible,
          value: idDetalleCita,
        };
      }
    }).filter((cita) => cita);
    console.log(citasDisponibles);

    res.status(200).json({ citasDisponibles });
  } catch (error) {
    console.log(error);

    res.status(505).json(error);
  }
};
const getParametrosporEntidad = async (req, res) => {
  const { entidad } = req.params;
  try {
    const parametros = await Parametros.findAll({
      where: { entidad_param: entidad, flag: true },
      attributes: [
        ["id_param", "value"],
        ["label_param", "label"],
        ["grupo_param", "grupo"],
      ],
    });
    res.status(200).json(parametros);
  } catch (error) {
    res.status(404).json(error);
  }
};
const getParametrosporENTIDADyGRUPO = async (req = request, res = response) => {
  const { grupo, entidad } = req.params;
  try {
    const parametros = await Parametros.findAll({
      order: [["id_param", "DESC"]],
      where: { entidad_param: entidad, grupo_param: grupo, flag: true },
      attributes: [
        ["id_param", "value"],
        ["label_param", "label"],
      ],
    });
    res.status(200).json(parametros);
  } catch (error) {
    res.status(404).json(error);
  }
};
const getParametrosporENTIDAD = async (req = request, res = response) => {
  const { grupo, entidad } = req.params;
  try {
    const parametros = await Parametros.findAll({
      order: [["id_param", "DESC"]],
      where: { entidad_param: entidad, grupo_param: grupo, flag: true },
      attributes: [
        ["id_param", "value"],
        ["label_param", "label"],
      ],
    });
    res.status(200).json(parametros);
  } catch (error) {
    res.status(404).json(error);
  }
};
const getParametrosporProveedor = async (req, res) => {
  try {
    const { tipo } = req.params;
    const parametros = await Proveedor.findAll({
      where: { flag: true, tipo },
      order: [["id", "desc"]],
      attributes: [
        ["id", "value"],
        [
          Sequelize.fn(
            "CONCAT",
            Sequelize.col("id"),
            " | ",
            Sequelize.col("razon_social_prov"),
          ),
          "label",
        ],
        ["id_oficio", "id_oficio"],
        ["id_empresa", "id_empresa"],
        // "id_oficio",
        // ["razon_social_prov", "label"],
      ],
    });
    res.status(200).json(parametros);
  } catch (error) {
    res.status(404).json(error);
  }
};
const getParametrosporCliente = async (req, res) => {
  try {
    const parametros = await Cliente.findAll({
      where: { flag: true },
      attributes: [
        "uid",
        ["id_cli", "value"],
        [
          Sequelize.literal(
            "CONCAT(numDoc_cli, ' | ', nombre_cli, ' ', apPaterno_cli, ' ', apMaterno_cli)",
          ),
          "label",
        ],
        "email_cli",
        "tipoCli_cli",
        "tel_cli",
        "uid",
      ],
      include: [
        {
          model: Venta,
          include: [
            {
              model: detalleVenta_membresias,
              attributes: [
                "fec_inicio_mem",
                "fec_fin_mem",
                "id_pgm",
                "id_st",
                "id_tarifa",
                "tarifa_monto",
              ],
              required: true,
              include: [
                {
                  model: ProgramaTraining,
                  attributes: ["name_pgm"],
                },
                {
                  model: SemanasTraining,
                  attributes: ["semanas_st"],
                },
              ],
            },
          ],
        },
      ],
    });
    res.status(200).json(parametros);
  } catch (error) {
    res.status(404).json(error);
  }
};
const getParametrosporClientexEmpresa = async (req, res) => {
  const { id_empresa } = req.params;
  try {
    const parametros = await Cliente.findAll({
      where: { flag: true, id_empresa: id_empresa },
      attributes: [
        "uid",
        ["id_cli", "value"],
        [
          Sequelize.literal(
            "CONCAT(numDoc_cli, ' | ', nombre_cli, ' ', apPaterno_cli, ' ', apMaterno_cli)",
          ),
          "label",
        ],
        "email_cli",
        "tipoCli_cli",
        "tel_cli",
        "uid",
      ],
    });
    res.status(200).json(parametros);
  } catch (error) {
    res.status(404).json(error);
  }
};
const getParametrosporProductosCategoria = async (
  req = request,
  res = response,
) => {
  try {
    const { categoria } = req.params;
    const productos = await Producto.findAll({
      where: { id_categoria: categoria },
      attributes: [
        ["id", "value"],
        [
          Sequelize.literal("CONCAT(nombre_producto, ' | ', prec_venta)"),
          "label",
        ],
        ["nombre_producto", "nombre_producto"],
        ["prec_venta", "venta"],
        ["stock_producto", "stock"],
        ["estado_product", "estado"],
      ],
    });
    res.status(200).json(productos);
  } catch (error) {
    res.status(404).json(error);
  }
};
const postParametros = async (req = request, res = response) => {
  const { sigla, entidad } = req.params;
  const { label_param, sigla_param } = req.body;
  try {
    const parametro = new Parametros({
      grupo_param: sigla,
      entidad_param: entidad,
      label_param,
      sigla_param,
    });
    await parametro.save();
    res.status(200).json({
      msg: "success",
      parametro,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de programa, hable con el administrador: ${error}`,
    });
  }
};
const getParametrosEmpleadosxDep = async (req = request, res = response) => {
  try {
    const { departamento } = req.params;
    const empleados = await Empleado.findAll({
      where: { departamento_empl: departamento, estado_empl: true, flag: true },
      attributes: [
        ["id_empl", "value"],
        [
          Sequelize.literal(
            "CONCAT(nombre_empl, ' ', apPaterno_empl, ' ', apMaterno_empl)",
          ),
          "label",
        ],
      ],
    });
    res.status(200).json(empleados);
  } catch (error) {
    res.status(404).json(error);
  }
};
const getParametrosEmpleadosxDepxEmpresa = async (
  req = request,
  res = response,
) => {
  try {
    const { departamento, id_empresa } = req.params;
    const empleados = await Empleado.findAll({
      where: {
        departamento_empl: departamento,
        id_empresa: id_empresa,
        estado_empl: true,
        flag: true,
      },
      attributes: [
        ["id_empl", "value"],
        [
          Sequelize.literal("CONCAT(nombre_empl, ' ', apPaterno_empl)"),
          "label",
        ],
        ["cargo_empl", "cargo_empl"],
      ],
      include: [
        {
          model: ImagePT,
        },
      ],
    });
    res.status(200).json(empleados);
  } catch (error) {
    res.status(404).json(error);
  }
};
const getParametrosLogosProgramas = async (req = request, res = response) => {
  try {
    const logosPgm = await ProgramaTraining.findAll({
      where: { estado_pgm: true, flag: true },

      include: [
        {
          model: ImagePT,
          where: { flag: true },
          attributes: ["name_image", "width", "height"],
          required: true,
        },
      ],
      attributes: ["id_pgm", "estado_pgm", "name_pgm"],
    });
    res.status(200).json(logosPgm);
  } catch (error) {
    console.log(error);
    res.status(404).json(error);
  }
};
const getParametroSemanaPGM = async (req = request, res = response) => {
  const { id_pgm } = req.params;
  try {
    const semanas = await SemanasTraining.findAll({
      where: { id_pgm: id_pgm, flag: true, estado_st: true },
      order: [["semanas_st", "ASC"]],
      attributes: [
        ["id_st", "value"],
        ["semanas_st", "semanas"],
        ["congelamiento_st", "cong"],
        ["nutricion_st", "nutric"],
        ["sesiones", "sesiones"],
        [
          Sequelize.literal(
            "CONCAT(semanas_st, ' Semanas | ', sesiones, ' Sesiones', ' | ', congelamiento_st, ' dias de congelamientos', ' | ', nutricion_st, ' citas nutricion')",
          ),
          "label",
        ],
      ],
    });
    res.status(200).json(semanas);
  } catch (error) {
    res.status(404).json(error);
  }
};
const getParametroHorariosPGM = async (req, res) => {
  const { id_pgm } = req.params;
  try {
    const horarios = await HorarioProgramaPT.findAll({
      where: { id_pgm: id_pgm, flag: true, estado_HorarioPgm: true },
      attributes: [
        ["id_horarioPgm", "value"],
        [
          Sequelize.literal(
            "CONCAT(time_HorarioPgm, ' | ', 'Aforo: ', aforo_HorarioPgm)",
          ),
          "label",
        ],
        ["time_HorarioPgm", "horario"],
        ["aforo_HorarioPgm", "aforo"],
        ["trainer_HorarioPgm", "trainer"],
      ],
      include: [
        {
          model: Empleado,
          attributes: [
            [
              Sequelize.literal(
                "CONCAT(nombre_empl, ' ', apPaterno_empl, ' ', apMaterno_empl)",
              ),
              "empl_trainer",
            ],
          ],
        },
      ],
    });
    res.status(200).json(horarios);
  } catch (error) {
    res.status(404).json(error);
  }
};
const getParametroTarifasSM = async (req = request, res = response) => {
  const { id_st } = req.params;
  try {
    const tarifas = await TarifaTraining.findAll({
      where: { id_st: id_st, flag: true, estado_tt: true },
      attributes: [
        ["id_tt", "value"],
        [
          Sequelize.literal("CONCAT(nombreTarifa_tt, ' | ', tarifaCash_tt)"),
          "label",
        ],
        ["nombreTarifa_tt", "nombre_tarifa"],
        ["tarifaCash_tt", "tarifa"],
      ],
    });
    res.status(200).json(tarifas);
  } catch (error) {
    res.status(404).json(error);
  }
};
const getParametroMetaxAsesor = async (req = request, res = response) => {
  const { id_meta } = req.params;
  try {
    const asesores = await Empleado.findAll({
      where: {
        id_empl: {
          [Op.notIn]: Sequelize.literal(`(
            SELECT DISTINCT "meta_asesor" 
            FROM "tb_Meta_vs_Asesores" 
            WHERE "id_meta" = '${id_meta}'
          )`),
        },
      },
    });
    console.log(asesores);

    res.status(200).json(asesores);
  } catch (error) {
    res.status(404).json(error);
  }
};
const getParametrosFormaPago = async (req = request, res = response) => {
  try {
    const formaPago = await FormaPago.findAll({
      include: [
        {
          model: Parametros,
          as: "FormaPagoLabel",
          attributes: ["label_param"],
        },
        {
          model: Parametros,
          as: "TipoTarjetaLabel",
          attributes: ["label_param"],
        },
        { model: Parametros, as: "TarjetaLabel", attributes: ["label_param"] },
        { model: Parametros, as: "BancoLabel", attributes: ["label_param"] },
      ],
    });
    // const formaPagoConLabels = formaPago.map((item) => {
    //   const formaPagoLabel = item.FormaPagoLabel
    //     ? item.FormaPagoLabel.label_param
    //     : null;
    //   const bancoLabel = item.BancoLabel ? item.BancoLabel.label_param : null;
    //   const tipoTarjetaLabel = item.TipoTarjetaLabel
    //     ? item.TipoTarjetaLabel.label_param
    //     : null;
    //   const tarjetaLabel = item.TarjetaLabel
    //     ? item.TarjetaLabel.label_param
    //     : null;
    //   const formattedLabel = `FORMA DE PAGO: ${
    //     formaPagoLabel ? `${formaPagoLabel}` : ""
    //   }${bancoLabel ? ` | BANCO: ${bancoLabel} ` : ""}${
    //     tipoTarjetaLabel ? `| ${tipoTarjetaLabel}` : ""
    //   }${tarjetaLabel ? ` - ${tarjetaLabel}` : ""}`;
    //   return {
    //     value: item.id,
    //     label: formattedLabel,
    //   };
    // });
    res.status(200).json({
      formaPago,
    });
  } catch (error) {
    console.log(error);
    res.status(404).json(error);
  }
};
const getParametrosFinanzas = async (req, res) => {
  try {
    const { tipo } = req.params;
    const finanzas = await ParametroGastos.findAll({
      where: {
        flag: true,
        tipo,
      },
      attributes: ["id", "id_empresa", "grupo", "id_tipoGasto", "nombre_gasto"],
    });
    res.status(200).json(finanzas);
  } catch (error) {
    res.status(404).json(error);
  }
};
const getParametroGrupoxTIPOGASTO = async (req = request, res = response) => {
  const { id_tipo_gasto } = req.params;
  try {
    const grupos = await ParametroGastos.findAll({
      where: {
        id_tipoGasto: id_tipo_gasto,
        flag: true,
      },
      attributes: ["grupo"],
      having: Sequelize.literal("COUNT(*) = 1"),
    });
    res.status(200).json(grupos);
  } catch (error) {
    res.status(404).json(error);
  }
};
const getParametroxTIPOGASTOXID = async (req = request, res = response) => {
  const { id_ } = req.params;
};
const getParametroGasto = async (req = request, res = response) => {
  const { id } = req.params;
  try {
    const paramGasto = await ParametroGastos.findOne({
      where: { id },
      attributes: ["grupo", "id_tipoGasto"],
    });
    res.status(200).json({
      msg: "ok",
      paramGasto,
    });
  } catch (error) {
    res.status(404).json(error);
  }
};
const getProgramasActivos = async (req = request, res = response) => {
  try {
    const programasActivos = await ProgramaTraining.findAll({
      where: { estado_pgm: true, flag: true },
      attributes: [
        ["id_pgm", "value"],
        ["name_pgm", "label"],
      ],
    });
    res.status(200).json({
      msg: "ok",
      programasActivos,
    });
  } catch (error) {
    res.status(404).json(error);
  }
};

async function getMembresiasLineaDeTiempoEmpresa(
  req = request,
  res = response,
) {
  try {
    const empresa = Number(req.query.empresa);
    if (!empresa) {
      return res.status(400).json({ error: "Falta query ?empresa" });
    }
    const incluirMontoCero = String(req.query.incluirMontoCero ?? "0") === "1";

    const rows = await detalleVenta_membresias.findAll({
      attributes: [
        "id",
        "id_pgm",
        "tarifa_monto",
        "fec_fin_mem",
        "fec_fin_mem_oftime",
        "fec_fin_mem_viejo",
        "flag",
      ],
      include: [
        {
          model: ExtensionMembresia,
          attributes: ["dias_habiles"],
          required: false,
        },
        {
          model: Venta,
          attributes: ["id", "id_empresa", "fecha_venta"],
          where: { id_empresa: empresa, flag: true },
          required: true,
          include: [
            {
              model: Cliente,
              attributes: [
                "id_cli",
                "nombre_cli",
                "apPaterno_cli",
                "apMaterno_cli",
              ],
              required: false,
            },
            {
              model: Empleado,
              attributes: ["nombre_empl", "apPaterno_empl", "apMaterno_empl"],
              required: false,
            },
          ],
        },
        {
          model: ProgramaTraining,
          attributes: ["id_pgm", "name_pgm"],
          required: false,
        },
      ],
      raw: false,
    });
    const idsPgm = [...new Set(rows.map((r) => r?.id_pgm).filter(Boolean))];
    let pgmNameById = {};
    if (idsPgm.length) {
      const pgms = await ProgramaTraining.findAll({
        where: { id_pgm: idsPgm },
        attributes: ["id_pgm", "name_pgm"],
        raw: true,
      });
      pgmNameById = Object.fromEntries(pgms.map((p) => [p.id_pgm, p.name_pgm]));
    }
    const timeline = [];
    for (const m of rows) {
      if (!isActiveFlag(m?.flag)) continue;
      const monto = Number(m?.tarifa_monto ?? 0);

      const fin = calcFinEfectivo(m);
      if (!fin) continue;

      let ventaDate = m?.tb_ventum?.fecha_venta
        ? new Date(m.tb_ventum.fecha_venta)
        : null;
      if (!ventaDate || isNaN(ventaDate)) continue;
      ventaDate.setHours(0, 0, 0, 0);

      const cliObj = m?.tb_ventum?.tb_cliente || {};
      const id_cli = cliObj.id_cli ?? null;
      const cliente =
        [cliObj.nombre_cli, cliObj.apPaterno_cli, cliObj.apMaterno_cli]
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim() || "SIN NOMBRE";

      const plan =
        m?.tb_programa_training?.name_pgm ||
        m?.tb_programaTraining?.name_pgm ||
        m?.tb_programa?.name_pgm ||
        pgmNameById[m?.id_pgm] ||
        (m?.id_pgm ? `PGM ${m.id_pgm}` : "-");
      const nombreEmpl = m?.tb_ventum?.tb_empleado?.nombre_empl ?? "";
      const ejecutivo = nombreEmpl.split(" ")[0] || "-";
      timeline.push({
        id_detalle: m.id,
        id_cli,
        cliente,
        plan,
        monto,
        ejecutivo,
        fechaVenta: ventaDate.toISOString().slice(0, 10),
        fechaFin: fin.toISOString().slice(0, 10),
      });
    }

    timeline.sort(
      (a, b) =>
        (a.id_cli ?? 0) - (b.id_cli ?? 0) ||
        a.fechaVenta.localeCompare(b.fechaVenta),
    );

    return res.json({ empresa, total: timeline.length, timeline });
  } catch (err) {
    console.error("getMembresiasLineaDeTiempoEmpresa", err);
    return res.status(500).json({
      error: "Error obteniendo línea de tiempo de membresías.",
      detail: err.message,
    });
  }
}

// pero mucho más rápido porque no trae Clientes, Empleados ni Nombres aquí.
const getVigentesResumenEmpresa = async (req, res) => {
  try {
    const empresa = Number(req.query.empresa || 598);
    const dias = Number(req.query.dias || 15);
    const incluirMontoCero = String(req.query.incluirMontoCero ?? "0") === "1";

    // ==========================
    // 1) Calcular snapshot y límite
    // ==========================
    let snapStr = String(req.query.snapshot || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(snapStr)) {
      const now = new Date();
      const year = Number(req.query.year || now.getFullYear());
      const selectedMonth = Number(
        req.query.selectedMonth || now.getMonth() + 1,
      );
      const lastDay = new Date(year, selectedMonth, 0).getDate();
      const isCurrentMonth =
        year === now.getFullYear() && selectedMonth === now.getMonth() + 1;

      const maxCutAllowed = isCurrentMonth
        ? Math.min(now.getDate(), lastDay)
        : lastDay;

      const cutDay = Math.max(
        1,
        Math.min(Number(req.query.cutDay || maxCutAllowed), maxCutAllowed),
      );

      snapStr = `${year}-${String(selectedMonth).padStart(2, "0")}-${String(
        cutDay,
      ).padStart(2, "0")}`;
    }

    const snapshot = new Date(snapStr);
    snapshot.setHours(0, 0, 0, 0);
    const snapshotTime = snapshot.getTime();

    const lim = new Date(snapshot);
    lim.setDate(lim.getDate() + dias);
    lim.setHours(0, 0, 0, 0);
    const limTime = lim.getTime();

    // ==========================
    // 2) Armar where usando Op (filtramos lo obvio en DB)
    // ==========================
    const whereDetalle = {};

    // Si NO se deben incluir montos 0, filtramos ya en la DB
    if (!incluirMontoCero) {
      whereDetalle.tarifa_monto = { [Op.gt]: 0 };
    }

    // ==========================
    // 3) Traer solo lo necesario desde la BD
    // ==========================
    const rows = await detalleVenta_membresias.findAll({
      attributes: [
        "id",
        "tarifa_monto",
        "fec_inicio_mem",
        "fec_fin_mem",
        "fec_fin_mem_oftime",
        "fec_fin_mem_viejo",
        "flag",
      ],
      where: whereDetalle,
      include: [
        {
          model: ExtensionMembresia,
          attributes: ["dias_habiles"],
          required: false,
        },
        {
          model: Venta,
          attributes: ["id", "id_empresa"],
          where: { id_empresa: empresa, flag: true },
          required: true,
        },
        {
          model: SemanasTraining,
          attributes: ["id_st", "semanas_st"],
          required: false,
        },
      ],
    });

    // ==========================
    // 4) Recorrer filas y clasificar
    // ==========================
    let vigentes = 0;
    let venceEnSnapshot = 0;
    let porVencer = 0;
    let vencidos = 0;

    for (const m of rows) {
      if (!isActiveFlag(m.flag)) continue;

      const monto = Number(m.tarifa_monto ?? 0);
      if (!incluirMontoCero && monto <= 0) continue;

      const fin = calcFinEfectivo(m);
      if (!fin) continue;

      const inicio = getInicioBase(m);
      // si la membresía empieza DESPUÉS del snapshot, no está vigente todavía
      if (inicio && inicio > snapshot) continue;

      const f = new Date(fin);
      f.setHours(0, 0, 0, 0);
      const fTime = f.getTime();

      if (fTime < snapshotTime) {
        vencidos++;
        continue;
      }

      if (fTime === snapshotTime) {
        venceEnSnapshot++;
        vigentes++;
        continue;
      }

      // vigente después del snapshot
      vigentes++;
      if (fTime <= limTime) {
        porVencer++;
      }
    }

    // ==========================
    // 5) Respuesta
    // ==========================
    return res.json({
      snapshot: snapshot.toISOString().slice(0, 10),
      vigentes,
      hoy: venceEnSnapshot,
      porVencer,
      vencidos,
    });
  } catch (e) {
    console.error("getVigentesResumenEmpresa", e);
    return res
      .status(500)
      .json({ error: "Error calculando resumen de vigencia." });
  }
};

const getMembresiasVigentesEmpresa = async (req, res) => {
  try {
    const empresa = Number(req.query.empresa || 598);

    const rows = await detalleVenta_membresias.findAll({
      attributes: [
        "id",
        "tarifa_monto",
        "fec_inicio_mem",
        "fec_fin_mem",
        "fec_fin_mem_oftime",
        "fec_fin_mem_viejo",
        "flag",
        "id_pgm",
      ],
      include: [
        {
          model: Venta,
          attributes: ["id", "id_empresa", "fecha_venta"],
          where: { id_empresa: empresa, flag: true },
          required: true,
          include: [
            {
              model: Cliente,
              attributes: [
                "id_cli",
                "nombre_cli",
                "apPaterno_cli",
                "apMaterno_cli",
              ],
              required: false,
            },
            {
              model: Empleado,
              attributes: ["nombre_empl", "apPaterno_empl", "apMaterno_empl"],
              required: false,
            },
          ],
        },
        {
          model: ProgramaTraining,
          attributes: [["name_pgm", "plan_name"]],
          required: false,
        },
        {
          model: ExtensionMembresia,
          attributes: ["dias_habiles"],
          required: false,
        },
        {
          model: SemanasTraining,
          attributes: ["id_st", "semanas_st"],
          required: false,
        },
      ],
      raw: false,
    });

    const idsPgm = [...new Set(rows.map((r) => r?.id_pgm).filter(Boolean))];
    let pgmNameById = {};
    if (idsPgm.length) {
      const pgms = await ProgramaTraining.findAll({
        where: { id_pgm: idsPgm },
        attributes: ["id_pgm", "name_pgm"],
        raw: true,
      });
      pgmNameById = Object.fromEntries(pgms.map((p) => [p.id_pgm, p.name_pgm]));
    }

    let snapStr = String(req.query.snapshot || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(snapStr)) {
      const now = new Date();
      const year = Number(req.query.year || now.getFullYear());
      const selectedMonth = Number(
        req.query.selectedMonth || now.getMonth() + 1,
      );
      const lastDay = new Date(year, selectedMonth, 0).getDate();
      const isCurrentMonth =
        year === now.getFullYear() && selectedMonth === now.getMonth() + 1;

      const maxCutAllowed = isCurrentMonth
        ? Math.min(now.getDate(), lastDay)
        : lastDay;
      const cutDay = Math.max(
        1,
        Math.min(Number(req.query.cutDay || maxCutAllowed), maxCutAllowed),
      );

      snapStr = `${year}-${String(selectedMonth).padStart(2, "0")}-${String(
        cutDay,
      ).padStart(2, "0")}`;
    }

    const snapshot = new Date(snapStr);
    snapshot.setHours(0, 0, 0, 0);

    const vigentes = [];
    for (const m of rows) {
      if (!isActiveFlag(m?.flag)) continue;
      if (!(Number(m?.tarifa_monto ?? 0) > 0)) continue;

      const fin = calcFinEfectivo(m);
      if (!fin) continue;

      const inicio = getInicioBase(m);
      // 👇 si empieza después del snapshot, aún no cuenta como vigente
      if (inicio && inicio > snapshot) continue;

      // vigentes respecto a snapshot
      if (fin < snapshot) continue;

      const cliente =
        [
          m?.tb_ventum?.tb_cliente?.nombre_cli,
          m?.tb_ventum?.tb_cliente?.apPaterno_cli,
          m?.tb_ventum?.tb_cliente?.apMaterno_cli,
        ]
          .filter(Boolean)
          .join(" ")
          .trim() || "SIN NOMBRE";

      const nombreEmpl = m?.tb_ventum?.tb_empleado?.nombre_empl ?? "";
      const ejecutivo = nombreEmpl.split(" ")[0] || "-";

      const plan =
        m?.tb_programa_training?.name_pgm ||
        m?.tb_programaTraining?.name_pgm ||
        m?.tb_programa?.name_pgm ||
        pgmNameById[m?.id_pgm] ||
        (m?.id_pgm ? `PGM ${m.id_pgm}` : "-");

      const dias_restantes = Math.ceil((fin - snapshot) / 86400000);

      vigentes.push({
        id: m.id,
        cliente,
        plan,
        fechaFin: fin.toISOString().slice(0, 10),
        dias_restantes,
        monto: Number(m?.tarifa_monto) || 0,
        ejecutivo,
      });
    }

    return res.json({ total: vigentes.length, vigentes });
  } catch (e) {
    console.error("getVigentesListaEmpresa", e);
    return res
      .status(500)
      .json({ error: "Error listando vigentes", detail: e.message });
  }
};

const getRenovacionesPorVencerEmpresa = async (req, res) => {
  try {
    const {
      empresa = 598,
      year,
      month,
      initDay = 1,
      cutDay,
      dias = 15,
    } = req.query;

    const rows = await detalleVenta_membresias.findAll({
      attributes: [
        "id",
        "id_pgm",
        "tarifa_monto",
        "fec_inicio_mem",
        "fec_fin_mem",
        "fec_fin_mem_oftime",
        "fec_fin_mem_viejo",
        "flag",
      ],
      include: [
        { model: ExtensionMembresia, attributes: ["dias_habiles"] },
        {
          model: Venta,
          attributes: ["id", "fecha_venta"],
          where: {
            id_empresa: empresa,
            flag: true,
            fecha_venta: { [Op.gte]: "2023-01-01 00:00:00" },
          },
          include: [
            {
              model: Cliente,
              attributes: [
                "id_cli",
                "nombre_cli",
                "apPaterno_cli",
                "apMaterno_cli",
              ],
            },
            {
              model: Empleado,
              attributes: ["nombre_empl", "apPaterno_empl", "apMaterno_empl"],
            },
          ],
        },
        {
          model: SemanasTraining,
          attributes: ["id_st", "semanas_st"],
          required: false,
        },
      ],
    });

    const idsPgm = [...new Set(rows.map((r) => r?.id_pgm).filter(Boolean))];
    let pgmNameById = {};
    if (idsPgm.length) {
      const pgms = await ProgramaTraining.findAll({
        where: { id_pgm: idsPgm },
        attributes: ["id_pgm", "name_pgm"],
        raw: true,
      });
      pgmNameById = Object.fromEntries(pgms.map((p) => [p.id_pgm, p.name_pgm]));
    }

    let rangeStart = new Date();
    let rangeEnd = new Date();

    if (year && month) {
      const lastDay = new Date(year, month, 0).getDate();
      const cDay = cutDay ? Math.min(cutDay, lastDay) : lastDay;

      rangeStart = new Date(year, month - 1, initDay);
      rangeEnd = new Date(year, month - 1, cDay);
    } else {
      rangeEnd.setDate(rangeEnd.getDate() + Number(dias));
    }
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd.setHours(0, 0, 0, 0);

    const clientMap = new Map();

    for (const m of rows) {
      const flagStr = String(m.flag ?? "").toLowerCase();
      if (
        !(
          flagStr === "1" ||
          flagStr === "true" ||
          m.flag === 1 ||
          m.flag === true
        )
      )
        continue;
      if (Number(m.tarifa_monto || 0) <= 0) continue;

      const base = getFinBase(m);
      if (!base) continue;

      const ext = Array.isArray(m.tb_extension_membresia)
        ? m.tb_extension_membresia
        : [];
      const diasHab = ext.reduce(
        (acc, e) => acc + parseInt(e?.dias_habiles ?? 0, 10),
        0,
      );

      const fechaFinCalculada = new Date(base);
      fechaFinCalculada.setDate(fechaFinCalculada.getDate() + diasHab);
      fechaFinCalculada.setHours(0, 0, 0, 0);

      const cliObj = m?.tb_ventum?.tb_cliente;
      if (!cliObj || !cliObj.id_cli) continue;
      const idCliente = cliObj.id_cli;

      if (
        !clientMap.has(idCliente) ||
        fechaFinCalculada > clientMap.get(idCliente).fechaSort
      ) {
        const empObj = m?.tb_ventum?.tb_empleado || {};
        const clienteNombre = [
          cliObj?.nombre_cli,
          cliObj?.apPaterno_cli,
          cliObj?.apMaterno_cli,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
        const ejecutivo =
          [empObj?.nombre_empl, empObj?.apPaterno_empl, empObj?.apMaterno_empl]
            .filter(Boolean)
            .join(" ")
            .split(" ")[0] || "-";
        const plan =
          pgmNameById[m?.id_pgm] || (m?.id_pgm ? `PGM ${m.id_pgm}` : "-");

        clientMap.set(idCliente, {
          fechaSort: fechaFinCalculada,
          data: {
            id: m.id,
            cliente: clienteNombre,
            plan,
            fechaFin: fechaFinCalculada.toISOString().slice(0, 10),
            monto: Number(m.tarifa_monto),
            ejecutivo,
            fechaFinDate: fechaFinCalculada,
          },
        });
      }
    }

    const renewals = [];
    const nowForDiff = new Date();
    nowForDiff.setHours(0, 0, 0, 0);

    clientMap.forEach((val) => {
      const f = val.fechaSort;

      if (f >= rangeStart && f <= rangeEnd) {
        const diff = Math.round((f - nowForDiff) / 86400000);

        renewals.push({
          ...val.data,
          dias_restantes: diff,
        });
      }
    });

    res.json({ renewals });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
const getLogicaEstadoMembresias = async (req, res) => {
  const { id_cli: uid } = req.params;
  try {
    const membresias = await detalleVenta_membresias.findAll({
      attributes: [
        "id",
        "tarifa_monto",
        "fec_fin_mem",
        "fec_fin_mem_oftime",
        "fec_fin_mem_viejo",
        "flag",
        "id_pgm",
      ],
      order: [["id", "DESC"]],
      include: [
        {
          model: ExtensionMembresia,
          attributes: [
            "dias_habiles",
            "tipo_extension",
            "extension_inicio",
            "extension_fin",
          ],
        },
        {
          model: Venta,
          attributes: ["id", "fecha_venta"],
          where: {
            flag: true,
          },
          include: [
            {
              model: Cliente,
              where: { uid },
              attributes: [
                "id_cli",
                "uid",
                [
                  Sequelize.fn(
                    "CONCAT",
                    Sequelize.col("nombre_cli"),
                    " ",
                    Sequelize.col("apPaterno_cli"),
                    " ",
                    Sequelize.col("apMaterno_cli"),
                  ),
                  "nombres_apellidos_cli",
                ],
                "email_cli",
              ],
            },
          ],
        },
        { model: ProgramaTraining, attributes: ["id_pgm", "name_pgm"] },
      ],
    });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const mapped = membresias.map((m) => {
      const fin = calcFinEfectivo(m);
      const dias_restantes = fin ? Math.round((fin - hoy) / 86400000) : null;
      return {
        id: m.id,
        plan: m.tb_programa_training?.name_pgm,
        monto: Number(m.tarifa_monto || 0),
        flag: m.flag,
        fechaFin: fin ? fin.toISOString().slice(0, 10) : null,
        dias_restantes,
      };
    });

    res.json({ membresias: mapped });
  } catch (e) {
    console.error("getLogicaEstadoMembresias", e);
    res.status(500).json({ error: "Error calculando estado de membresía." });
  }
};
const getLogicaEstadoMembresia = async (req = request, res = response) => {
  const { id_cli } = req.params;

  try {
    let membresias = await detalleVenta_membresias.findAll({
      attributes: ["id", "fec_inicio_mem", "fec_fin_mem"],
      // limit: 20,
      flag: true,
      order: [["id", "DESC"]],
      include: [
        {
          model: ExtensionMembresia,
          attributes: [
            "tipo_extension",
            "extension_inicio",
            "extension_fin",
            "dias_habiles",
          ],
        },
        {
          model: Venta,
          attributes: ["id", "fecha_venta"],
          raw: true,
          where: {
            flag: true,
          },
          include: [
            {
              model: Cliente,
              where: { uid: id_cli },
              attributes: [
                "id_cli",
                "uid",
                [
                  Sequelize.fn(
                    "CONCAT",
                    Sequelize.col("nombre_cli"),
                    " ",
                    Sequelize.col("apPaterno_cli"),
                    " ",
                    Sequelize.col("apMaterno_cli"),
                  ),
                  "nombres_apellidos_cli",
                ],
                "email_cli",
              ],
            },
          ],
        },
        {
          model: ProgramaTraining,
          attributes: ["id_pgm", "name_pgm"],
          include: [
            {
              model: ImagePT,
              attributes: ["name_image", "id"],
            },
          ],
        },
        {
          model: SemanasTraining,
          attributes: ["id_st", "semanas_st"],
        },
      ],
    });
    const currentDate = new Date();
    let newMembresias = membresias
      .map((item) => {
        const itemJSON = item.toJSON();
        const tbExtensionMembresia = itemJSON.tb_extension_membresia || [];

        if (tbExtensionMembresia.length === 0) {
          // Si tb_extension_membresia está vacío
          return {
            ...itemJSON,
            dias: 0,
            // diasPorTerminar: diasLaborables(
            //   new Date(),
            //   new Date(itemJSON.fec_fin_mem)
            // ),
            fec_fin_mem_new: itemJSON.fec_fin_mem, // La nueva fecha es igual a fec_fin_mem
          };
        }
        const totalDiasHabiles = (itemJSON.tb_extension_membresia || []).reduce(
          (total, ext) => total + parseInt(ext.dias_habiles, 10),
          0,
        );

        // Calcular la nueva fecha sumando los días hábiles a 'fec_fin_mem'
        const fecFinMem = new Date(itemJSON.fec_fin_mem);
        const fecFinMemNew = addBusinessDays(fecFinMem, totalDiasHabiles);

        return {
          dias: totalDiasHabiles,
          // diasPorTerminar: diasLaborables(new Date(), fecFinMemNew.toISOString()),
          fec_fin_mem_new: fecFinMemNew.toISOString(), // Ajusta el formato según tus necesidades
          ...itemJSON,
        };
      })
      .filter((item) => {
        if (item.tb_ventum) {
          return item.tb_ventum?.tb_cliente?.uid === id_cli;
        }
      });
    console.log(newMembresias);

    res.status(200).json({
      membresias: [newMembresias[0]],
    });
  } catch (error) {
    console.log(error);
    res.status(505).json({
      error: error,
    });
  }
};


const getMembresiasCruzadas = async (req, res) => {
  try {
    const empresa = Number(req.query.empresa || 598);
    const year = Number(req.query.year || new Date().getFullYear());
    const selectedMonth = Number(req.query.selectedMonth || new Date().getMonth() + 1);
    const initDay = Number(req.query.initDay || 1);
    const cutDay = Number(req.query.cutDay || new Date(year, selectedMonth, 0).getDate());

    // 1. Armamos las fechas exactas
    const rangeStart = new Date(year, selectedMonth - 1, initDay);
    rangeStart.setHours(0, 0, 0, 0);

    const rangeEnd = new Date(year, selectedMonth - 1, cutDay);
    rangeEnd.setHours(23, 59, 59, 999);

    // Strings limpios para evitar que SQL Server falle con las zonas horarias
    const startStr = `${year}-${String(selectedMonth).padStart(2, '0')}-${String(initDay).padStart(2, '0')} 00:00:00`;
    const endStr = `${year}-${String(selectedMonth).padStart(2, '0')}-${String(cutDay).padStart(2, '0')} 23:59:59`;

    // 2. Traemos todas las membresías activas
    const rows = await detalleVenta_membresias.findAll({
      // AGREGADO: "id_st" a los atributos
      attributes: ["id", "fec_inicio_mem", "id_venta", "id_pgm", "id_st", "flag"],
      where: {
        flag: true,
        // Traemos todo lo que inició antes del fin del rango. 
        // (Quitamos el filtro de BD de fec_fin_mem porque ahora lo calcularemos en JS)
        fec_inicio_mem: { [Op.lte]: endStr }
      },
      include: [
        {
          model: Venta,
          attributes: ["id", "id_empresa", "observacion"],
          where: { id_empresa: empresa, flag: true },
          required: true,
          include: [
            {
              model: Cliente,
              attributes: ["id_cli", "nombre_cli", "apPaterno_cli", "apMaterno_cli"],
              required: true
            },
            {
              model: Empleado,
              attributes: ["nombre_empl", "apPaterno_empl"],
              required: false
            }
          ]
        },
        {
          model: ProgramaTraining,
          attributes: ["name_pgm"],
          required: false
        },
        // AGREGADO: Incluimos la tabla de semanas para poder calcular el fin
        {
          model: SemanasTraining,
          attributes: ["id_st", "semanas_st"],
          required: false
        }
      ]
    });

    // 3. Agrupamos las membresías por ID de cliente
    const clientMemberships = {};
    for (const m of rows) {
      const cliObj = m.tb_ventum?.tb_cliente;
      if (!cliObj) continue;

      const idCli = cliObj.id_cli;
      if (!clientMemberships[idCli]) {
        clientMemberships[idCli] = [];
      }
      clientMemberships[idCli].push(m);
    }

    // 4. Lógica Matemática de JS para hallar los solapamientos
    const cruces = [];

    Object.keys(clientMemberships).forEach(idCli => {
      const mems = clientMemberships[idCli];

      // Ordenamos por fecha de inicio
      mems.sort((a, b) => new Date(a.fec_inicio_mem) - new Date(b.fec_inicio_mem));

      // Doble bucle para comparar Membresía A con Membresía B
      for (let i = 0; i < mems.length; i++) {
        for (let j = i + 1; j < mems.length; j++) {
          const memA = mems[i];
          const memB = mems[j];

          if (memA.id_venta === memB.id_venta) continue;


          const startA = new Date(memA.fec_inicio_mem);
          const semanasA = memA.SemanasTraining?.semanas_st || memA.tb_semana_training?.semanas_st || 0;
          const endA = new Date(startA);
          // Sumamos (semanas * 7 días)
          endA.setDate(endA.getDate() + (semanasA * 7));
          endA.setHours(23, 59, 59, 999);

          const startB = new Date(memB.fec_inicio_mem);
          const semanasB = memB.SemanasTraining?.semanas_st || memB.tb_semana_training?.semanas_st || 0;
          const endB = new Date(startB);
          endB.setDate(endB.getDate() + (semanasB * 7));
          endB.setHours(23, 59, 59, 999);
          // ==========================================

          // ¿Se cruzan la A y la B en general?
          if (startA < endB && endA > startB) {

            // Calculamos el periodo exacto del cruce
            const overlapStart = new Date(Math.max(startA, startB));
            const overlapEnd = new Date(Math.min(endA, endB));

            // ¿Este cruce ocurre DENTRO del mes que el usuario seleccionó en la UI?
            if (overlapStart <= rangeEnd && overlapEnd >= rangeStart) {

              const diffTime = overlapEnd - overlapStart;
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

              if (diffDays > 1) {
                const c = memA.tb_ventum.tb_cliente;
                const eA = memA.tb_ventum.tb_empleado || {};
                const eB = memB.tb_ventum.tb_empleado || {};

                cruces.push({
                  cliente_id: idCli,
                  nombre_cliente: [c.nombre_cli, c.apPaterno_cli, c.apMaterno_cli].filter(Boolean).join(" "),
                  id_mem_A: memA.id,
                  plan_A: memA.tb_ProgramaTraining?.name_pgm || "-",
                  venta_A: memA.id_venta,
                  observacion_A: memA.tb_ventum?.observacion || "",
                  inicio_A: startA.toISOString().slice(0, 10),
                  fin_A: endA.toISOString().slice(0, 10), // Mostramos la fecha que acabamos de calcular
                  asesor_A: [eA.nombre_empl, eA.apPaterno_empl].filter(Boolean).join(" ") || "-",

                  id_mem_B: memB.id,
                  plan_B: memB.tb_ProgramaTraining?.name_pgm || "-",
                  venta_B: memB.id_venta,
                  observacion_B: memB.tb_ventum?.observacion || "",
                  inicio_B: startB.toISOString().slice(0, 10),
                  fin_B: endB.toISOString().slice(0, 10), // Mostramos la fecha que acabamos de calcular
                  asesor_B: [eB.nombre_empl, eB.apPaterno_empl].filter(Boolean).join(" ") || "-",

                  dias_solapados: diffDays
                });
              }
            }
          }
        }
      }
    });

    cruces.sort((a, b) => b.dias_solapados - a.dias_solapados);

    return res.json({
      intervalo: {
        inicio: rangeStart.toISOString().slice(0, 10),
        fin: rangeEnd.toISOString().slice(0, 10)
      },
      total_cruces: cruces.length,
      cruces
    });

  } catch (error) {
    console.error("Error en getMembresiasCruzadas:", error);
    return res.status(500).json({ error: "Error calculando cruces.", detail: error.message });
  }
};
const getParametrosVendedoresVendiendoTodo = async (
  req = request,
  res = response,
) => {
  try {
    const filtroVendedores_ventas = await Venta.findAll({
      attributes: ["id_empl", "fecha_venta"],
      where: { flag: true },
      include: [
        {
          model: Empleado,
          attributes: [
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
      raw: true,
    });
    let groupedByIdEmpl = filtroVendedores_ventas.reduce((acc, venta) => {
      const { id_empl } = venta;
      if (!acc[id_empl]) {
        acc[id_empl] = [];
      }
      acc[id_empl].push(venta);
      return acc;
    }, {});

    groupedByIdEmpl = Object.keys(groupedByIdEmpl).map((id_empl) => {
      return {
        value: parseInt(id_empl),
        label:
          groupedByIdEmpl[id_empl][0]["tb_empleado.nombres_apellidos_empl"],
      };
    });
    res.status(200).json({
      msg: "ok",
      vendedores: groupedByIdEmpl,
    });
  } catch (error) {
    console.log(error);
    res.status(404).json(error);
  }
};
const getParametrosInversionistasRegistrados = async (
  req = request,
  res = response,
) => {
  try {
    const inversionistas = await Inversionista.findAll({
      attributes: [
        ["id", "value"],
        ["nombres_completos", "label"],
      ],
    });
    res.status(200).json({
      msg: "ok",
      inversionistas,
    });
  } catch (error) {
    res.status(404).json(error);
  }
};
const getParametrosColaboradoresRegistrados = async (
  req = request,
  res = response,
) => {
  try {
    const colaboradores = await Empleado.findAll({
      attributes: [
        ["id_empl", "value"],
        [
          Sequelize.literal(
            "CONCAT(nombre_empl, ' ', apPaterno_empl, ' ', apMaterno_empl)",
          ),
          "label",
        ],
      ],
      where: {
        estado_empl: true,
        flag: true,
      },
    });
    res.status(200).json({
      msg: "ok",
      colaboradores,
    });
  } catch (error) {
    res.status(404).json(error);
  }
};
const getCitasServicioxCliente = async (req = request, res = response) => {
  try {
    const { id_cli } = req.params;
    const { fecha_param } = req.query;
    const citasAdquiridasxMembresia = await CitasAdquiridas.findAll({
      where: { id_cli },
      attributes: ["id"],
      raw: true,
      include: [
        {
          model: Cliente,
          attributes: [],
        },
        {
          model: detalleVenta_membresias,
          attributes: [],
          required: true,
          include: [
            {
              model: SemanasTraining,
              attributes: [
                ["nutricion_st", "citas_cantidad"],
                [Sequelize.fn("CONCAT", "", "MEMBRESIA: "), "cita_label"],
              ],
            },
          ],
        },
      ],
    });
    const citasAdquiridasxVentas = await CitasAdquiridas.findAll({
      where: { id_cli },
      attributes: ["id"],
      raw: true,
      include: [
        {
          model: Cliente,
          attributes: [],
        },
        {
          model: detalleVenta_citas,
          attributes: [
            ["cantidad", "citas_cantidad"],
            [Sequelize.fn("CONCAT", "", "VENTA: "), "cita_label"],
          ],
          required: true,
        },
      ],
    });
    const EventoCita = await Cita.findAll({
      where: { id_cli },
      raw: true,
      include: [
        {
          model: CitasAdquiridas,
          attributes: [],
        },
      ],
    });

    res.status(200).json({
      msg: "ok",
      // adquiridasCitas: [
      //   ...citasAdquiridasxMembresia,
      //   ...citasAdquiridasxVentas,
      // ],
      // EventoCita,
      citasDisponibles: calcularCitasDisponibles(
        [...citasAdquiridasxMembresia, ...citasAdquiridasxVentas],
        EventoCita,
        fecha_param,
      ),
    });
  } catch (error) {
    console.log(error);

    res.status(500).json(error);
  }
};
const getParametrosVentaFitology = async (req = request, res = response) => {
  const { tipo_serv } = req.params;
  try {
    const fitology = await Servicios.findAll({
      where: { flag: true, tipo_servicio: tipo_serv },
      attributes: [
        [
          Sequelize.literal(
            "CONCAT(nombre_servicio, ' | CANTIDAD: ', cantidad_servicio, ' | TARIFA: ', tarifa_servicio)",
          ),
          "label",
        ],
        ["id", "value"],
      ],
    });
    res.status(200).json({
      msg: "ok",
      fitology,
    });
  } catch (error) {
    res.status(500).json(error);
  }
};
const postParametros3 = async (req = request, res = response) => {
  const { id_1, id_2, id_3 } = req.body;
  const { entidad } = req.params;

  try {
    const nuevoParametro = new Parametros_3({
      entidad,
      id_1,
      id_2,
      id_3,
    });
    await nuevoParametro.save();
    console.log(id_1, id_2, id_3);
    res.status(200).json({
      msg: "ok",
      nuevoParametro,
    });
  } catch (error) {
    res.status(500).json(error);
  }
};
const calcularCitasDisponibles = (
  citasAdquiridas,
  citasUsadas,
  fecha_param,
) => {
  // Crear un mapa de citas usadas por ID de cita adquirida y filtrarlas por la fecha_param

  const citasUsadasMap = citasUsadas.reduce((map, citaUsada) => {
    const idCitaAdquirida = citaUsada.id_cita_adquirida;
    map[idCitaAdquirida] = (map[idCitaAdquirida] || 0) + 1; // Sumar 1 por cada cita usada

    // Contabilizar solo las citas usadas que son anteriores a fecha_param
    // if (new Date(citaUsada.fecha_init) < new Date(fecha_param)) {
    // }
    return map;
  }, {});

  // Calcular las citas disponibles restando las usadas
  const citasDisponibles = citasAdquiridas.map((cita) => {
    const id = cita.id;

    // Determinar la cantidad de citas según el tipo de venta (membresía o venta de citas)
    const citasCantidad =
      cita["detalle_ventaMembresium.tb_semana_training.citas_cantidad"] ||
      parseInt(cita["detalle_ventaCita.citas_cantidad"] || 0, 10);

    const citasUsadas = citasUsadasMap[id] || 0; // Cantidad de citas usadas para esta cita adquirida

    // Restar citas usadas
    const citasRestantes = citasCantidad - citasUsadas;

    // Si quedan citas disponibles, devolver el objeto actualizado
    if (citasRestantes > 0) {
      return {
        id: cita.id,
        label_membresia:
          cita["detalle_ventaMembresium.tb_semana_training.cita_label"],
        label_venta_cita: cita["detalle_ventaCita.cita_label"],
        citas_disponibles: citasRestantes, // Cantidad de citas restantes
      };
    }

    return null;
  });

  return citasDisponibles.filter((cita) => cita !== null);
};

const actualizarParametro = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const { label_param } = req.body;
    const parametro = await Parametros.findOne({
      where: { id_param: id },
    });
    await parametro.update({ label_param });
    res.status(200).json({
      msg: "ok",
      parametro: parametro,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Error",
      response: error.message,
    });
  }
};

const postEliminar = async (req = request, res = response) => {
  try {
    const { id_param } = req.body;
    const parametro = await Parametros.findOne({
      where: { id_param: id_param },
    });

    parametro.flag = false;
    await parametro.save();

    res.status(200).json({
      msg: "ok",
      parametro: parametro,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Error",
      response: error.message,
    });
  }
};

const postRegistrarParametros = async (req = request, res = response) => {
  const { grupo_param, entidad_param } = req.params;
  const { label_param } = req.body;
  try {
    const parametro = new Parametros({
      grupo_param,
      entidad_param,
      label_param,
    });
    await parametro.save();
    res.status(200).json({
      msg: "success",
      parametro,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de programa, hable con el administrador: ${error}`,
    });
  }
};
const getParametrosporENTIDADyGRUPO__PERIODO = async (
  req = request,
  res = response,
) => {
  const { grupo, entidad } = req.params;
  try {
    const parametros = await Parametro_periodo.findAll({
      order: [["id_param", "DESC"]],
      where: { entidad_param: entidad, grupo_param: grupo, flag: true },
      attributes: [
        ["id_param", "value"],
        "fecha_desde_param",
        "fecha_hasta_param",
        ["descripcion_param", "label"],
      ],
    });
    res.status(200).json(parametros);
  } catch (error) {
    res.status(404).json(error);
  }
};
const postParametros__PERIODO = async (req = request, res = response) => {
  try {
    const { grupo, entidad } = req.params;
    const parametros = new Parametro_periodo({
      ...req.body,
      grupo_param: grupo,
      entidad_param: entidad,
    });
    await parametros.save();
    res.status(200).json(parametros);
  } catch (error) {
    res.status(404).json(error);
  }
};
const getParametrosZonas = async (req = request, res = response) => {
  const { id_enterprice } = req.params;
  try {
    console.log(id_enterprice, "holi");

    const zonas = await Parametros_zonas.findAll({
      order: [["id", "DESC"]],
      where: { flag: true, id_empresa: id_enterprice },
    });

    res.status(200).json(zonas);
  } catch (error) {
    console.log(error);
  }
};
const getServiciosxEmpresa = async (req = request, res = response) => {
  const { id_empresa } = req.params;
  try {
    const servicios = await ServiciosCircus.findAll({
      order: [["id", "DESC"]],
      where: { flag: true, id_empresa: id_empresa },
    });

    res.status(200).json(servicios);
  } catch (error) {
    console.log(error);
  }
};
const obtenerParametrosGruposGastos = async (req = request, res = response) => {
  const { id_empresa } = req.params;
  try {
    const gruposgastos = await ParametroGrupo.findAll({
      where: { id_empresa, flag: true },
    });
    res.status(200).json(gruposgastos);
  } catch (error) {
    console.log(error);
  }
};
const putParametrosGenerales = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const parametros = await Parametros.findOne({
      where: { id_param: id, flag: true },
    });
    await parametros.update(req.body);
    res.status(201).json({
      msg: "ok",
      id,
      parametros,
    });
  } catch (error) {
    res.status(404).json({
      error,
      msg: "no",
    });
  }
};
const deleteParametrosGenerales = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const parametros = await Parametros.findOne({
      where: { id_param: id, flag: true },
    });
    await parametros.update({ flag: false });
    res.status(201).json({
      msg: "ok",
      id,
      parametros,
    });
  } catch (error) {
    res.status(404).json({
      error,
      msg: "no",
    });
  }
};
module.exports = {
  getParametrosxEntidadxGrupo,
  getMembresiasLineaDeTiempoEmpresa,
  deleteParametrosGenerales,
  putParametrosGenerales,
  getMembresiasVigentesEmpresa,
  getMembresiasCruzadas,
  obtenerEmpleadosxCargoxDepartamentoxEmpresa,
  obtenerParametrosGruposGastos,
  getParametrosporClientexEmpresa,
  getParametrosEmpleadosxDepxEmpresa,
  obtenerDistritosxDepartamentoxProvincia,
  postParametros3,
  getParametrosVentaFitology,
  getParametrosTipoAportes,
  getParametros,
  postParametros,
  getParametrosporENTIDADyGRUPO,
  getParametrosporProveedor,
  getParametrosporCliente,
  getParametrosporProductosCategoria,
  getParametrosEmpleadosxDep,
  getParametrosLogosProgramas,
  getParametroSemanaPGM,
  getParametroHorariosPGM,
  getParametroTarifasSM,
  getParametroMetaxAsesor,
  getParametrosFormaPago,
  getParametrosporId,
  getParametrosporEntidad,
  getCitasDisponibleporClient,
  getParametrosFinanzas,
  getParametroGrupoxTIPOGASTO,
  getParametroxTIPOGASTOXID,
  getParametroGasto,
  getProgramasActivos,
  getLogicaEstadoMembresia,
  getLogicaEstadoMembresias,
  getRenovacionesPorVencerEmpresa,
  getVigentesResumenEmpresa,
  getParametrosVendedoresVendiendoTodo,
  getParametrosInversionistasRegistrados,
  getParametrosColaboradoresRegistrados,
  getCitasServicioxCliente,
  postRegistrarParametros,
  postEliminar,
  actualizarParametro,
  getParametrosZonas,
  getParametrosporENTIDADyGRUPO__PERIODO,
  postParametros__PERIODO,
  getServiciosxEmpresa,
  getParametrosporENTIDAD,
};
