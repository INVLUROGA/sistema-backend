const { response, request } = require("express");
const { generatePDFcontrato } = require("../config/pdfKit");
const {
  Venta,
  detalleVenta_producto,
  detalleVenta_membresias,
  detalleVenta_citas,
  detalleVenta_pagoVenta,
  detalleVenta_Transferencia,
  detalle_cambioPrograma,
  detalleventa_servicios,
  cajasMovimientos,
} = require("../models/Venta");
const { Cliente, Empleado } = require("../models/Usuarios");
const { Sequelize, Op } = require("sequelize");
const { Producto } = require("../models/Producto");
const NodeCache = require("node-cache");
const vencimientosResumenCache = new NodeCache({ stdTTL: 1800 }); // 30 mins TTL
const comparativoDashboardCache = new NodeCache({ stdTTL: 1800 }); // 30 mins TTL
const ventasGeneralesCache = new NodeCache({ stdTTL: 600 }); // 10 mins TTL
const {
  ProgramaTraining,
  SemanasTraining,
  TarifaTraining,
} = require("../models/ProgramaTraining");
const { HorarioProgramaPT } = require("../models/HorarioProgramaPT");
const { Parametros, EtiquetasxIds } = require("../models/Parametros");
const { v4 } = require("uuid");
const { typesCRUD } = require("../types/types");
const { capturarAUDIT } = require("../middlewares/auditoria");
const { Servicios } = require("../models/Servicios");
const { Client_Contrato } = require("../helpers/pdf/Client_Contrato");
const dayjs = require("dayjs");
const transporterU = require("../config/nodemailer");
const { mailMembresiaSTRING } = require("../middlewares/mails");
require("dotenv").config();
const env = process.env;

const { ImagePT } = require("../models/Image");
const { Distritos } = require("../models/Distritos");
const { FormatMoney } = require("../helpers/formatMoney");
const utc = require("dayjs/plugin/utc");
const { Marcacion } = require("../models/Marcacion");
const { Cita, eventoServicio } = require("../models/Cita");
const { ExtensionMembresia } = require("../models/ExtensionMembresia");
const { ServiciosCircus } = require("../models/modelsCircus/Servicios");
const sumarSemanas = require("../helpers/sumarSemanas");

// Cargar el plugin
dayjs.extend(utc);
const postCajaApertura = async (req = request, res = response) => {
  try {
    const caja = new cajasMovimientos({
      fecha_apertura: new Date(),
      fecha_cierre: new Date(3000, 0, 1),
    });
    await caja.save();
    res.status(200).json({
      ok: true,
      msg: caja,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error en el servidor" + error,
    });
  }
};
const buscarCajasxFecha = async (req = request, res = response) => {
  try {
    const { fecha } = req.query;
    const cajas = await cajasMovimientos.findAll({
      order: [["id", "desc"]],
      where: {
        fecha_apertura: { [Op.lte]: fecha }, // apertura ≤ ahora
        fecha_cierre: { [Op.gte]: fecha }, // cierre ≥ ahora
      },
    });
    res.status(201).json({
      cajas,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error en el servidor" + error,
    });
  }
};
const estadosClienteMembresiaVar = async (req = request, res = response) => {
  //const {tipoPrograma , fechaDesde, fechaHasta} = req.body;
  const { tipoPrograma, fechaDesde, fechaHasta } = req.body;
  try {
    const respuesta = await estadosClienteMembresiaV2(
      tipoPrograma,
      fechaDesde,
      fechaHasta,
    );
    res.status(200).json({
      ok: true,
      msg: respuesta,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error en el servidor" + error,
    });
  }
};

async function estadosClienteMembresiaV2(
  tipoPrograma,
  fechaDesdeStr,
  fechaHastaStr,
) {
  fechaDesdeStr = new Date(fechaDesdeStr);
  fechaHastaStr = new Date(fechaHastaStr);

  let VentasPorCliente = {};
  let response = {};

  let ventas;
  if (tipoPrograma == 0) {
    ventas = await Venta.findAll({
      order: [["fecha_venta", "DESC"]],
      where: {
        id_tipoFactura: {
          [Op.ne]: 701, // Excluye los registros con id_tipoFactura igual a 84
        },
      },
      flag: true,
      include: [
        {
          model: Cliente,
          attributes: [
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
          ],
        },
        {
          model: detalleVenta_membresias,
          where: {
            //id_pgm: tipoPrograma,
            flag: true,
            tarifa_monto: {
              [Op.ne]: 0.0, // Excluye los registros con id_tipoFactura igual a 84
            },
          },
          include: [
            {
              model: ProgramaTraining,
              attributes: ["name_pgm"],
            },
            {
              model: SemanasTraining,
              attributes: ["semanas_st", "congelamiento_st", "nutricion_st"],
            },
            {
              model: ImagePT,
              as: "contrato_x_serv",
              attributes: ["name_image"],
            },
          ],
          required: true,
        },
      ],
      //limit: 2,
    });
  } else {
    ventas = await Venta.findAll({
      order: [["fecha_venta", "DESC"]],
      where: {
        id_tipoFactura: {
          [Op.ne]: 701, // Excluye los registros con id_tipoFactura igual a 84
        },
      },
      flag: true,

      include: [
        {
          model: detalleVenta_membresias,
          where: {
            id_pgm: tipoPrograma,
            flag: true,
            tarifa_monto: {
              [Op.ne]: 0.0, // Excluye los registros con id_tipoFactura igual a 84
            },
          },

          include: [
            {
              model: ProgramaTraining,
              attributes: ["name_pgm"],
            },
            {
              model: SemanasTraining,
              attributes: ["semanas_st", "congelamiento_st", "nutricion_st"],
            },
            {
              model: ImagePT,
              as: "contrato_x_serv",
              attributes: ["name_image"],
            },
          ],
          required: true,
        },
        {
          model: Cliente,
          attributes: [
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
          ],
        },
      ],
      //limit: 2,
    });
  }

  ventas.map((venta) => {
    if (!VentasPorCliente[venta.id_cli]) {
      VentasPorCliente[venta.id_cli] = {
        ventas: [venta],
      };
    } else {
      VentasPorCliente[venta.id_cli].ventas.push(venta);
    }
  });

  for (let key in VentasPorCliente) {
    let contadorVentasConTrue = 0;
    let ContadorVentasGeneral = 0;
    let tipoCliente = "";

    let Primerafecha_fin_membresia;
    let Segundafecha_fin_membresia;
    VentasPorCliente[key].ventas.map((venta) => {
      venta = venta.toJSON();

      let primeraFechaVenta = venta.fecha_venta;
      //let fecha_venta = new Date(venta.fecha_venta);
      let segundaFechaVenta = venta.fecha_venta;

      let fecha_venta = new Date(venta.fecha_venta);
      ContadorVentasGeneral++;

      if (primeraFechaVenta < fecha_venta) {
        primeraFechaVenta = fecha_venta;
      }
      if (
        new Date(venta.detalle_ventaMembresia[0].fec_fin_mem) >
        Segundafecha_fin_membresia
      ) {
        Segundafecha_fin_membresia = new Date(
          venta.detalle_ventaMembresia[0].fec_fin_mem,
        );
      }

      if (fecha_venta >= fechaDesdeStr && fecha_venta <= fechaHastaStr) {
        contadorVentasConTrue++;
      }

      if (contadorVentasConTrue == 1 && ContadorVentasGeneral == 1) {
        tipoCliente = "Cliente Nuevo";
        Primerafecha_fin_membresia = new Date(
          venta.detalle_ventaMembresia[0].fec_fin_mem,
        );
      }

      if (contadorVentasConTrue == 2 || ContadorVentasGeneral == 2) {
        Segundafecha_fin_membresia = new Date(
          venta.detalle_ventaMembresia[0].fec_fin_mem,
        );
      }
      if (
        primeraFechaVenta &&
        Segundafecha_fin_membresia /*&& (contadorVentasConTrue == 2)*/
      ) {
        //la primera es la más reciente y la segunda es la más antigua
        if (primeraFechaVenta < Segundafecha_fin_membresia) {
          //01/01/2022 < 02/01/2021
          tipoCliente = "Cliente Reinscrito";
        }
        if (primeraFechaVenta > Segundafecha_fin_membresia) {
          //01/01/2022 < 02/01/2021
          tipoCliente = "Cliente Renovado";
        }
      }

      if (venta.id_cli == 882) {
        console.log(venta);
        console.log(primeraFechaVenta + " " + Segundafecha_fin_membresia);
      }

      if (!response[key]) {
        response[key] = {
          ventas: [venta],
          tipoCliente: tipoCliente,
        };
      } else {
        response[key].ventas.push(venta);
        response[key].tipoCliente = tipoCliente;
      }
    });
  }

  response = ContadoresEstadoClienteInscripcion(
    response,
    fechaDesdeStr,
    fechaHastaStr,
  );
  return response;
}

function ContadoresEstadoClienteInscripcion(
  AnalisisGeneral,
  fechaDesde,
  fechaHasta,
) {
  let response = {};
  let clientesNuevos = {};
  let clientesRei = {};
  let clientesReno = {};
  let contadorClienteNuevo = 0;
  let contadorClienteRenovado = 0;
  let contadorClienteReinscrito = 0;
  console.log(AnalisisGeneral);

  for (key in AnalisisGeneral) {
    AnalisisGeneral[key].ventas.map((venta) => {
      let fechaVenta = new Date(venta.fecha_venta);

      if (fechaVenta >= fechaDesde && fechaVenta <= fechaHasta) {
        switch (AnalisisGeneral[key].tipoCliente) {
          case "Cliente Nuevo":
            contadorClienteNuevo++;

            clientesNuevos[key] = {
              idCliente: key,
              ventas: venta,
              tipoCliente: "Cliente Nuevo",
            };
            break;
          case "Cliente Reinscrito":
            contadorClienteReinscrito++;
            clientesRei[key] = {
              idCliente: key,
              ventas: venta,
              tipoCliente: "Cliente reinscrito",
            };
            break;
          case "Cliente Renovado":
            contadorClienteRenovado++;
            clientesReno[key] = {
              idCliente: key,
              ventas: venta,
              tipoCliente: "Cliente renovados",
            };
            break;

          default:
            break;
        }
      }
    });
  }

  response.cantidadPorEstado = {
    ClienteNuevo: contadorClienteNuevo,
    ClienteReinscrito: contadorClienteReinscrito,
    ClienteRenovado: contadorClienteRenovado,
  };
  response.clientesNuevos = Object.values(clientesNuevos);
  response.clientesRei = Object.values(clientesRei);
  response.clientesReno = Object.values(clientesReno);

  return response;
}

const comparativaPorProgramaApi = async (req = request, res = response) => {
  const { fecha } = req.params;
  //const {tipoPrograma , fechaDesde, fechaHasta} = req.body;
  try {
    let fechaDate = new Date(fecha);
    let nroMesActual = fechaDate.getMonth();
    let NroMesAnterior = nroMesActual - 1;

    const respuesta1 = await comparativaPorPrograma(
      new Date(fechaDate.getFullYear(), nroMesActual, 1),
    );
    //const respuesta2  = await comparativaPorPrograma(new Date (fechaDate.getFullYear() , NroMesAnterior , 1));
    //const respuesta3  = await comparativaPorPrograma(fecha);

    const resultado = {
      mesActual: respuesta1,
      //mesAnterior : respuesta2
    };

    res.status(200).json({
      ok: true,
      msg: resultado,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Error en el servidor" + error,
    });
  }
};

async function comparativaPorPrograma(fecha) {
  let resultado = {};
  let fechaDate = new Date(fecha);
  let nroMes = fechaDate.getMonth();

  let primerDiaMesActual = new Date(fechaDate.getFullYear(), nroMes, 1);
  let ultimoDiaMesActual = new Date(fechaDate.getFullYear(), nroMes + 1, 0);

  let ventasMesActual = await Venta.findAll({
    where: {
      fecha_venta: { [Op.between]: [primerDiaMesActual, ultimoDiaMesActual] },
      flag: true,
    },
  });

  await Promise.all(
    ventasMesActual.map(async (venta) => {
      let detalleMembresia = await detalleVenta_membresias.findOne({
        where: {
          id_venta: venta.id,
        },
      });

      if (detalleMembresia) {
        let programaTraining = await ProgramaTraining.findOne({
          where: {
            id_pgm: detalleMembresia.id_pgm,
          },
        });

        if (!resultado[programaTraining.name_pgm]) {
          resultado[programaTraining.name_pgm] = {
            cantidad: 1,
            monto: detalleMembresia.tarifa_monto,
            tikectMedio: 0,
          };
        }

        if (resultado[programaTraining.name_pgm]) {
          resultado[programaTraining.name_pgm].cantidad += 1;
          resultado[programaTraining.name_pgm].monto +=
            detalleMembresia.tarifa_monto;
        }

        //resultado[programaTraining.name_pgm] = ( resultado[programaTraining.name_pgm] || 0 ) + 1;
        //programaTraining.name_pgm;
      }
    }),
  );

  for (programa in resultado) {
    let tikectMedio = resultado[programa].monto / resultado[programa].cantidad;
    resultado[programa].tikectMedio = tikectMedio.toFixed(2);
  }

  return resultado;
}

function calcularEdad(fecha_nac) {
  const hoy = dayjs();
  const fechaNacimiento = dayjs(fecha_nac);
  const edad = hoy.diff(fechaNacimiento, "year");
  return edad;
}
function formatearNumero(numero) {
  return numero.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
}

const postVenta = async (req = request, res = response) => {
  // const { uid_firma, uid_contrato } = req.query;
  const uid_firma = v4();
  const uid_contrato = v4();
  console.log({ rb: JSON.stringify(req.body, 2, null) });

  // let base64_contratoPDF = "";
  try {
    if (req.servicios && req.servicios.length > 0) {
      const ventasServiciosConIdVenta = await req.servicios.map((producto) => ({
        id_servicio: producto.id_servicio,
        cantidad: producto.cantidad,
        tarifa_monto: producto.tarifa,
        observacion: producto.observacion,
        id_venta: req.ventaID,
        id_empl: producto.id_empl,
      }));
      // Crear múltiples registros en detalleVenta_producto
      await detalleventa_servicios.bulkCreate(ventasServiciosConIdVenta);
    }
    if (req.productos && req.productos.length > 0) {
      console.log({ r: req.productos });

      const ventasProductosConIdVenta = await req.productos.map((producto) => ({
        id_producto: producto.id_producto,
        cantidad: producto.cantidad,
        precio_unitario: producto.precio_unitario,
        tarifa_monto: producto.tarifa,
        id_venta: req.ventaID,
        id_empl: producto.id_empl || 0, //ID SI ES CIRCUS SI NO ES 0
      }));
      // Crear múltiples registros en detalleVenta_producto
      await detalleVenta_producto.bulkCreate(ventasProductosConIdVenta);
    }
    if (req.ventaProgramas && req.ventaProgramas.length > 0) {
      const ventasMembresiasConIdVenta = await req.ventaProgramas.map(
        (mem) => ({
          id_venta: req.ventaID,
          uid_firma: uid_firma,
          uid_contrato: uid_contrato,
          ...mem,
        }),
      );

      await detalleVenta_membresias.bulkCreate(ventasMembresiasConIdVenta);
    }
    if (req.citas && req.citas.length > 0) {
      const ventasCitasConIdVenta = await req.citas.map((cita) => ({
        id_venta: req.ventaID,
        id_cita: cita.value,
        cantidad: cita.cantidad,
        tarifa_monto: cita.tarifa,
      }));
      await detalleVenta_citas.bulkCreate(ventasCitasConIdVenta);
    }
    if (req.ventaTransferencia && req.ventaTransferencia.length > 0) {
      const ventasTransferenciaConIdVenta = await req.ventaTransferencia.map(
        (transferencia) => ({
          id_venta: req.ventaID,
          ...transferencia,
        }),
      );
      await detalleVenta_Transferencia.bulkCreate(
        ventasTransferenciaConIdVenta,
      );
    }
    if (req.pagosExtraidos && req.pagosExtraidos.length > 0) {
      const pagosVentasConIdVenta = await req.pagosExtraidos.map((pagos) => ({
        id_venta: req.ventaID,
        ...pagos,
      }));
      await detalleVenta_pagoVenta.bulkCreate(pagosVentasConIdVenta);
    }
    let formAUDIT = {
      id_user: req.id_user,
      ip_user: req.ip_user,
      accion: typesCRUD.POST,
      observacion: `Se agrego: La venta de id ${req.ventaID}`,
    };
    await capturarAUDIT(formAUDIT);
    res.status(200).json({
      msg: `Venta creada con exito`,
      uid_firma,
      idVenta: req.ventaID,
      uid_contrato: uid_contrato,
      // base64_contratoPDF: base64_contratoPDF,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: `Error en el servidor, en controller de postVenta, hable con el administrador: ${error}`,
    });
  }
};
const obtener_contrato_pdf = async (req = request, res = response) => {
  try {
    const { dataVenta, detalle_cli_modelo, dataPagos } = req.body;
    console.log({ rb: req.body, dataVenta });

    const pdfContrato = await getPDF_CONTRATO(
      dataVenta.dataSemana?.value,
      detalle_cli_modelo,
      dataPagos,
      dataVenta.dataHorario.horario,
      0,
      dataVenta.dataTarifa.value,
      dataVenta.fecha_inicio,
      dataVenta.firmaCli,
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=CONTRATO-CLIENTE.pdf",
    );
    res.send(Buffer.from(pdfContrato));
  } catch (error) {
    console.log(error);
  }
};
const getPDF_CONTRATO = async (
  id_st,
  dataVenta,
  dataPago,
  horario,
  id_venta,
  id_tarifa,
  fecha_inicio,
  firmaCli,
) => {
  //
  /*
semanas,
    firmaCli,
    nutric,
    cong,
    time_h,
    id_pgm,
    name_pgm,
    fechaInicio_programa,
    fechaFinal,
    tarifa,
*/
  // const { dataPrograma, dataSemana, dataTarifa, dataHorario } =
  //   detalle_membresia;
  const { id_empl, id_cli, id_origen, fecha_venta } = dataVenta;

  const data_cliente = await Cliente.findOne({
    where: { flag: true, id_cli: id_cli },
  });
  const data_empl = await Empleado.findOne({
    where: { flag: true, id_empl: id_empl },
  });
  const data_Distrito = await Distritos.findOne({
    where: { flag: true, ubigeo: data_cliente.ubigeo_distrito_cli },
  });
  const data_origen = await Parametros.findOne({
    where: { flag: true, id_param: id_origen },
  });
  const dataSemanas = await SemanasTraining.findOne({
    where: { flag: true, id_st: id_st },
  });
  const dataPrograma = await ProgramaTraining.findOne({
    where: { flag: true, id_pgm: dataSemanas.id_pgm },
  });
  const dataTarifa = await TarifaTraining.findOne({
    where: { flag: true, id_tt: id_tarifa },
  });
  const dataInfo = {
    nombresCliente: data_cliente.nombre_cli,
    apPaternoCliente: data_cliente.apPaterno_cli,
    apMaternoCliente: data_cliente.apMaterno_cli,
    dni: `${data_cliente.numDoc_cli}`,
    DireccionCliente: data_cliente?.direccion_cli,
    PaisCliente: "Peru",
    CargoCliente: `${data_cliente?.cargo_cli}`,
    EmailCliente: data_cliente?.email_cli,
    EdadCliente: `${calcularEdad(data_cliente.fecha_nacimiento)}`,
    DistritoCliente: `${data_Distrito?.distrito}`,
    FechaDeNacimientoCliente: `${dayjs(data_cliente.fecha_nacimiento).format(
      "DD/MM/YYYY",
    )}`,
    CentroDeTrabajoCliente: `${data_cliente.trabajo_cli}`,
    origenCliente: `${data_origen?.label_param}`,
    sede: "Miraflores",
    nContrato: `${id_venta}`,
    codigoSocio: `${id_cli}`,
    fecha_venta: `${dayjs.utc(fecha_venta).format("DD/MM/YYYY")}`,
    hora_venta: `${dayjs.utc(fecha_venta).format("hh:mm:ss A")}`,
    //datos de membresia
    id_pgm: `${dataPrograma.id_pgm}`,
    Programa: `${dataPrograma.name_pgm}`,
    fec_inicio: `${dayjs.utc(fecha_inicio).format("DD/MM/YYYY")}`,
    fec_fin: `${dayjs(
      sumarSemanas(fecha_inicio, dataSemanas.semanas_st),
      "YYYY-MM-DD",
    ).format("DD/MM/YYYY")}`,
    horario: `${dayjs.utc(horario).format("hh:mm A")}`,
    semanas: `${dataSemanas.semanas_st}`,
    sesiones: `${dataSemanas.sesiones}`,
    dias_cong: `${dataSemanas.congelamiento_st}`,

    sesiones_nutricion: `${dataSemanas.nutricion_st}`,
    asesor: `${data_empl.nombre_empl.split(" ")[0]}`,
    forma_pago: dataPago?.map((item) => {
      if (item.id_forma_pago === 597) {
        return `${item.label_tipo_tarjeta?.split(" ")[1]} ${item.label_banco}`;
      } else {
        return item.label_forma_pago;
      }
    }),
    monto: `${FormatMoney(dataTarifa.tarifaCash_tt, "S/. ")}`,
    //Firma
    firma_cli: firmaCli,
  };

  const pdfContrato = await Client_Contrato(dataInfo);

  // Enviar el PDF como respuesta
  return pdfContrato;
};
const get_VENTAS = async (req = request, res = response) => {
  const { id_empresa } = req.params;
  try {
    const ventas = await Venta.findAll({
      where: { flag: true, id_empresa: id_empresa },
      attributes: [
        "id",
        "id_cli",
        "id_empl",
        "id_origen",
        "id_tipoFactura",
        "numero_transac",
        "fecha_venta",
        "status_remove",
        "observacion",
      ],
      order: [["fecha_venta", "DESC"]],
      include: [
        {
          model: Cliente,
          attributes: [
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
            "sexo_cli",
            "ubigeo_distrito_cli",
            "ubigeo_distrito_trabajo",
            "numDoc_cli",
            "tel_cli"

          ],
          include: [
            {
              model: ImagePT,
            },
          ],
        },
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
        {
          model: detalleVenta_Transferencia,
          as: "venta_venta",
          required: false, // Para que no excluya toda la venta si no tiene productos con flag=true
          attributes: ["id_venta", "tarifa_monto"],
        },
        {
          model: detalleVenta_producto,
          required: false, // Para que no excluya toda la venta si no tiene productos con flag=true
          attributes: [
            "id_venta",
            "id_producto",
            "cantidad",
            "precio_unitario",
            "tarifa_monto",
          ],
          include: [
            {
              model: Producto,
              attributes: ["id", "nombre_producto", "id_categoria"],
            },
          ],
        },
        {
          model: detalleVenta_membresias,
          required: false, // Para que no excluya toda la venta si no tiene productos con flag=true
          attributes: [
            "id",
            "id_venta",
            "id_pgm",
            "id_tarifa",
            "horario",
            "id_st",
            "tarifa_monto",
            "fecha_inicio",
            "id_membresia_anterior",
          ],
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
        {
          model: detalleVenta_citas,
          required: false,
          attributes: ["id_venta", "id_servicio", "tarifa_monto"],
        },
        {
          model: detalleVenta_pagoVenta,
          attributes: ["id_venta", "parcial_monto"],
          include: [
            {
              model: Parametros,
              as: "parametro_forma_pago",
            },
          ],
        },
      ],
    });
    //console.log({ ventas });

    res.status(200).json({
      ok: true,
      ventas,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: `Error en el servidor, en controller de get_VENTAS, hable con el administrador: ${error}`,
    });
  }
};

const getVentasDashboard = async (req = request, res = response) => {
  const { id_empresa } = req.params;
  const { fechaInicio, fechaFin } = req.query;

  try {
    const cacheKey = `ventasDash_${id_empresa}_${fechaInicio || 'all'}_${fechaFin || 'all'}`;
    const cachedData = ventasGeneralesCache.get(cacheKey);

    if (cachedData) {
      console.log(`[Cache Hit] Ventas Dashboard: ${cacheKey}`);
      return res.status(200).json(cachedData);
    }
    console.log(`[Cache Miss] Ventas Dashboard: ${cacheKey}`);

    const whereParams = { flag: true, id_empresa: id_empresa };

    if (fechaInicio && fechaFin) {
      whereParams.fecha_venta = {
        [Op.between]: [new Date(fechaInicio), new Date(fechaFin)],
      };
    }

    const ventas = await Venta.findAll({
      where: whereParams,
      attributes: [
        "id",
        "id_cli",
        "id_empl",
        "id_origen",
        "id_tipoFactura",
        "numero_transac",
        "fecha_venta",
        "status_remove",
        "observacion",
      ],
      order: [["fecha_venta", "DESC"]],
      include: [
        {
          model: Cliente,
          attributes: [
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
            "sexo_cli",
            "ubigeo_distrito_cli",
            "ubigeo_distrito_trabajo",
          ],
          include: [{ model: ImagePT }],
        },
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
        {
          model: detalleVenta_Transferencia,
          as: "venta_venta",
          required: false,
          attributes: ["id_venta", "tarifa_monto"],
        },
        {
          model: detalleVenta_producto,
          required: false,
          attributes: [
            "id_venta",
            "id_producto",
            "cantidad",
            "precio_unitario",
            "tarifa_monto",
          ],
          include: [
            {
              model: Producto,
              attributes: ["id", "nombre_producto", "id_categoria"],
            },
          ],
        },
        {
          model: detalleVenta_membresias,
          required: false,
          attributes: [
            "id",
            "id_venta",
            "id_pgm",
            "id_tarifa",
            "horario",
            "id_st",
            "tarifa_monto",
            "fecha_inicio",
            "id_membresia_anterior",
          ],
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
        {
          model: detalleVenta_citas,
          required: false,
          attributes: ["id_venta", "id_servicio", "tarifa_monto"],
        },
        {
          model: detalleVenta_pagoVenta,
          attributes: ["id_venta", "parcial_monto"],
          include: [
            {
              model: Parametros,
              as: "parametro_forma_pago",
            },
          ],
        },
      ],
    });

    const ventasMapeadas = ventas.map(v => v.get({ plain: true }));

    const responsePayload = {
      ok: true,
      ventas: ventasMapeadas,
    };

    ventasGeneralesCache.set(cacheKey, responsePayload);

    res.status(200).json(responsePayload);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: `Error en el servidor, en controller de getVentasDashboard, hable con el administrador: ${error}`,
    });
  }
};

const get_VENTAS_CIRCUS = async (req = request, res = response) => {
  try {
    const ventas = await Venta.findAll({
      where: { flag: true, id_empresa: 599 },
      attributes: [
        "id",
        "id_cli",
        "id_empl",
        "id_origen",
        "id_tipoFactura",
        "numero_transac",
        "fecha_venta",
        "status_remove",
        "observacion",
      ],
      order: [["fecha_venta", "DESC"]],
      include: [
        {
          model: Cliente,
          attributes: [
            [
              Sequelize.fn(
                "CONCAT",
                Sequelize.col("tb_cliente.nombre_cli"),
                " ",
                Sequelize.col("tb_cliente.apPaterno_cli"),
                " ",
                Sequelize.col("tb_cliente.apMaterno_cli"),
              ),
              "nombres_apellidos_cli",
            ],
            "nombre_cli",
            "apPaterno_cli",
            "apMaterno_cli",
          ],
        },
        {
          model: Empleado,
          as: "tb_empleado",
          attributes: [
            "id_empl",
            "uid",
            "uid_avatar",
            "nombre_empl",
            "apPaterno_empl",
            "apMaterno_empl",
            [
              Sequelize.fn(
                "CONCAT",
                Sequelize.col("tb_empleado.nombre_empl"),
                " ",
                Sequelize.col("tb_empleado.apPaterno_empl"),
                " ",
                Sequelize.col("tb_empleado.apMaterno_empl"),
              ),
              "nombres_apellidos_empl",
            ],
          ],
        },

        {
          model: detalleVenta_producto,
          required: false,
          attributes: [
            "id_venta",
            "id_producto",
            "cantidad",
            "precio_unitario",
            "tarifa_monto",
          ],
          include: [
            {
              model: Producto,
              attributes: [
                "nombre_producto",
                "prec_venta",
                "prec_compra",
                "id_categoria",
              ],
            },
            {
              model: Empleado,
              as: "empleado_producto",
              attributes: [
                [
                  Sequelize.fn(
                    "CONCAT",
                    Sequelize.col(
                      "detalle_ventaProductos->empleado_producto.nombre_empl",
                    ),
                    " ",
                    Sequelize.col(
                      "detalle_ventaProductos->empleado_producto.apPaterno_empl",
                    ),
                    " ",
                    Sequelize.col(
                      "detalle_ventaProductos->empleado_producto.apMaterno_empl",
                    ),
                  ),
                  "nombres_apellidos_empl",
                ],
              ],
            },
          ],
        },
        {
          model: detalleVenta_pagoVenta,
          attributes: ["id_venta", "parcial_monto", "n_operacion"],
          include: [
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_banco",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_forma_pago",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_tipo_tarjeta",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_tarjeta",
            },
          ],
        },
        {
          model: detalleventa_servicios,
          as: "detalle_ventaservicios",
          include: [
            {
              model: ServiciosCircus,
              attributes: [
                "nombre_servicio",
                "precio",
                "duracion",
                "id_categoria",
                "precio_compra",
              ],
            },
            {
              model: Empleado,
              as: "empleado_servicio",
              attributes: [
                [
                  Sequelize.fn(
                    "CONCAT",
                    Sequelize.col(
                      "detalle_ventaservicios->empleado_servicio.nombre_empl",
                    ),
                    " ",
                    Sequelize.col(
                      "detalle_ventaservicios->empleado_servicio.apPaterno_empl",
                    ),
                    " ",
                    Sequelize.col(
                      "detalle_ventaservicios->empleado_servicio.apMaterno_empl",
                    ),
                  ),
                  "nombres_apellidos_empl",
                ],
              ],
            },
          ],
        },
      ],
    });

    res.status(200).json({ ok: true, ventas });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: `Error en el servidor, en controller de get_VENTAS, hable con el administrador: ${error}`,
    });
  }
};

const updateDetalleServicio = async (req = request, res = response) => {
  const { id } = req.params;

  const { id_empl, tarifa_monto, id_servicio } = req.body;

  try {
    const detalle = await detalleventa_servicios.findByPk(id);
    if (!detalle) {
      return res.status(404).json({ ok: false, msg: "Detalle no encontrado" });
    }
    await detalle.update({
      // solo actualizo lo que venga definido
      ...(id_empl && { id_empl }),
      ...(id_servicio && { id_servicio }),
      ...(tarifa_monto != null && { tarifa_monto }),
    });

    return res.status(200).json({
      ok: true,
      msg: "Servicio actualizado",
      detalle,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      error: `Error en la actualización: ${error}`,
    });
  }
};
const updateDetalleProducto = async (req = request, res = response) => {
  const { id } = req.params;
  const { id_empl, tarifa_monto } = req.body; // Ajusta si tu campo de precio se llama distinto

  try {
    // Asegúrate de importar el modelo detalleVenta_producto
    const detalle = await detalleVenta_producto.findByPk(id);

    if (!detalle) {
      return res.status(404).json({ ok: false, msg: "Producto no encontrado" });
    }

    await detalle.update({
      id_producto_empleado: id_empl,
      tarifa_monto,
    });

    res.status(200).json({ ok: true, msg: "Producto actualizado" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, error: `Error: ${error}` });
  }
};
const get_VENTA_ID = async (req = request, res = response) => {
  const { id } = req.params;
  try {
    const venta = await Venta.findAll({
      attributes: [
        "id",
        "id_cli",
        "id_empl",
        "id_origen",
        "id_tipoFactura",
        "numero_transac",
        "fecha_venta",
        "observacion",
      ],
      where: { id: id, flag: true },
      order: [["id", "DESC"]],
      include: [
        {
          model: Cliente,
          attributes: [
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
          ],
        },
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
        {
          model: detalleVenta_producto,
          attributes: [
            "id_venta",
            "id_producto",
            "cantidad",
            "precio_unitario",
            "tarifa_monto",
          ],
          include: [
            {
              model: Producto,
              attributes: ["id", "nombre_producto", "id_categoria"],
            },
          ],
        },
        {
          model: detalleVenta_membresias,
          attributes: [
            "uid_contrato",
            "id_venta",
            "id_pgm",
            "id_tarifa",
            "id_st",
            "tarifa_monto",
            "fec_inicio_mem",
            "fec_fin_mem",
            "uid_firma",
            "horario",
          ],
          include: [
            {
              model: ProgramaTraining,
              attributes: ["name_pgm"],
            },
            {
              model: SemanasTraining,
              attributes: ["semanas_st", "congelamiento_st", "nutricion_st"],
            },
            {
              model: ImagePT,
              as: "contrato_x_serv",
              attributes: ["name_image"],
            },
          ],
        },
        {
          model: detalleVenta_citas,
          attributes: ["id_venta", "id_servicio", "tarifa_monto"],
        },
        {
          model: detalleVenta_Transferencia,
          as: "venta_venta",
          attributes: [
            "id_venta",
            "id_membresia",
            "tarifa_monto",
            "horario",
            "fec_inicio_mem",
            "fec_fin_mem",
          ],
          include: [
            {
              model: Venta,
              as: "venta_transferencia",
              include: [
                {
                  model: detalleVenta_membresias,
                  include: [
                    {
                      model: ProgramaTraining,
                      attributes: ["name_pgm"],
                    },
                    {
                      model: SemanasTraining,
                      attributes: [
                        "semanas_st",
                        "congelamiento_st",
                        "nutricion_st",
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          model: detalleVenta_pagoVenta,
          attributes: [
            "fecha_pago",
            "id_forma_pago",
            "id_tipo_tarjeta",
            "id_tarjeta",
            "id_banco",
            "parcial_monto",
            "n_operacion",
            "observacion",
          ],
          include: [
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_banco",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_forma_pago",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_tipo_tarjeta",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_tarjeta",
            },
          ],
        },
        {
          model: detalleventa_servicios,
          attributes: ["cantidad", "tarifa_monto"],
          include: [
            {
              model: ServiciosCircus,
              include: [
                {
                  model: Parametros,
                },
              ],
            },
          ],
        },
      ],
    });
    res.status(200).json({
      ok: true,
      venta,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de get_VENTAS, hable con el administrador: ${error}`,
    });
  }
};
const getVentasxFecha = async (req = request, res = response) => {
  const { arrayDate } = req.query;
  const { id_empresa } = req.params;
  const fechaInicio = arrayDate[0];
  const fechaFin = arrayDate[1];

  try {
    // 0. Revisar si solo necesitamos productos (optimización para reporte histórico)
    const { mode } = req.query; // 'products_only'
    const isProductsOnly = mode === "products_only";

    // 1. Query principal: Venta + Cliente + Empleado (raw para velocidad)
    // Si es products_only, NO hacemos join con Cliente ni Empleado
  console.log({
    fechas: [new Date(fechaInicio), new Date(fechaFin), fechaInicio, fechaFin],
  });

  try {
    const ventas = await Venta.findAll({
      attributes: [
        "id",
        "id_cli",
        "id_empl",
        "id_tipoFactura",
        "id_origen",
        "numero_transac",
        "fecha_venta",
        "id_empresa",
      ],
      where: {
        fecha_venta: {
          [Op.between]: [fechaInicio, fechaFin],
        },
        flag: true,
        id_empresa: id_empresa,
        id_tipoFactura: { [Op.in]: [699, 700] },
      },
      order: [["id", "DESC"]],
      include: [
        {
          model: Cliente,
          attributes: [
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
          ],
        },
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
        {
          model: detalleVenta_producto,
          attributes: [
            "id_venta",
            "id_producto",
            "cantidad",
            "precio_unitario",
            "tarifa_monto",
          ],
          include: [
            {
              model: Producto,
              attributes: ["id", "id_categoria", "nombre_producto"],
            },
          ],
        },
        {
          model: detalleVenta_membresias,
          attributes: [
            "id_venta",
            "id_pgm",
            "id_tarifa",
            "horario",
            "id_st",
            "tarifa_monto",
          ],
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
        {
          model: detalleVenta_citas,
          attributes: ["id_venta", "id_servicio", "tarifa_monto"],
          include: [
            {
              model: Servicios,
              attributes: ["id", "nombre_servicio", "tipo_servicio"],
            },
          ],
        },
        {
          model: detalleVenta_pagoVenta,
          attributes: ["id_venta", "parcial_monto"],
          include: [
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_banco",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_forma_pago",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_tipo_tarjeta",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_tarjeta",
            },
          ],
        },
        // {
        //   model: detalleventa_servicios,
        //   attributes: ["cantidad", "tarifa_monto"],
        //   include: [
        //     {
        //       model: ServiciosCircus,
        //       include: [
        //         {
        //           model: Parametros,
        //         },
        //       ],
        //     },
        //   ],
        // },
      ],
    });
    res.status(200).json({
      ok: true,
      ventas,
    });
  } catch (error) {
    console.log("errorrrr: ", error);

    res.status(500).json({
      error: `Error en el servidor, en controller de get_VENTASxFECHA, hable con el administrador: ${error}`,
    });
  }
};
const getVentasxFechaVenta = async (req = request, res = response) => {
  try {
    const { id_empresa } = req.params;
    const { arrayDate } = req.query;

    const fechaInicio = arrayDate[0];
    const fechaFin = arrayDate[1];
    try {
      const ventas = await Venta.findAll({
        where: {
          flag: true,
          id_empresa: id_empresa,
          fecha_venta: { [Op.between]: [fechaInicio, fechaFin] },
        },
        attributes: [
          "id",
          "id_cli",
          "id_empl",
          "id_origen",
          "id_tipoFactura",
          "numero_transac",
          "fecha_venta",
          "status_remove",
          "observacion",
        ],
        order: [["fecha_venta", "DESC"]],
        include: [
          {
            model: Cliente,
            attributes: [
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
              "sexo_cli",
              "ubigeo_distrito_cli",
              "ubigeo_distrito_trabajo",
            ],
            include: [
              {
                model: ImagePT,
              },
            ],
          },
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
          {
            model: detalleVenta_Transferencia,
            as: "venta_venta",
            required: false, // Para que no excluya toda la venta si no tiene productos con flag=true
            attributes: ["id_venta", "tarifa_monto"],
          },
          {
            model: detalleVenta_producto,
            required: false, // Para que no excluya toda la venta si no tiene productos con flag=true
            attributes: [
              "id_venta",
              "id_producto",
              "cantidad",
              "precio_unitario",
              "tarifa_monto",
            ],
            include: [
              {
                model: Producto,
                attributes: ["id", "nombre_producto", "id_categoria"],
              },
            ],
          },
          {
            model: detalleVenta_membresias,
            required: false, // Para que no excluya toda la venta si no tiene productos con flag=true
            attributes: [
              "id",
              "id_venta",
              "id_pgm",
              "id_tarifa",
              "horario",
              "id_st",
              "tarifa_monto",
              "fecha_inicio",
              "id_membresia_anterior",
            ],
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
          {
            model: detalleVenta_citas,
            required: false,
            attributes: ["id_venta", "id_servicio", "tarifa_monto"],
          },
          {
            model: detalleVenta_pagoVenta,
            attributes: ["id_venta", "parcial_monto"],
            include: [
              {
                model: Parametros,
                as: "parametro_forma_pago",
              },
            ],
          },
        ],
      });
      //console.log({ ventas });

      res.status(200).json({
        ok: true,
        ventas,
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        error: `Error en el servidor, en controller de get_VENTAS, hable con el administrador: ${error}`,
      });
    }
  } catch (error) {
    console.log(error);
  }
};

const mailMembresia = async (req = request, res = response) => {
  const { id_venta } = req.params;
  const { firma_base64 } = req.body;

  try {
    const venta = await Venta.findOne({ where: { id: id_venta } });
    const detalleMembresia = await detalleVenta_membresias.findOne({
      where: { id_venta: id_venta },
    });
    const detalle_semana = await SemanasTraining.findOne({
      where: { id_st: detalleMembresia.id_st },
    });
    const detalle_programa = await ProgramaTraining.findOne({
      where: { id_pgm: detalleMembresia.id_pgm },
    });

    const detalle_membresia = {
      semanas: detalle_semana.semanas_st,
      firmaCli: firma_base64,
      nutric: detalle_semana.nutricion_st,
      cong: detalle_semana.congelamiento_st,
      time_h: detalleMembresia.horario,
      id_pgm: detalleMembresia.id_pgm,
      name_pgm: detalle_programa.name_pgm,
      fechaInicio_programa: detalleMembresia.fec_inicio_mem,
      fechaFinal: detalleMembresia.fec_fin_mem,
      tarifa: detalleMembresia.tarifa_monto,
      id_tarifa: detalleMembresia.id_tarifa,
    };
    const detalleVenta = {
      id_cli: venta.id_cli,
      id_empl: venta.id_empl,
      id_origen: venta.id_origen,
      fecha_venta: venta.fecha_venta,
    };
    const dataCliente = await Cliente.findOne({
      where: { id_cli: detalleVenta.id_cli },
    });
    const dataEmpleado = await Empleado.findOne({
      where: { id_empl: detalleVenta.id_empl },
    });
    const dataPago = await detalleVenta_pagoVenta.findAll({
      where: { id_venta: id_venta },
    });
    console.log(detalle_membresia, "EN DETALLE VENTA");

    const pdfContrato = await getPDF_CONTRATO(
      detalleMembresia.id_st,
      detalleVenta,
      [],
      detalle_membresia.time_h,
      id_venta,
      detalle_membresia.id_tarifa,
      detalle_membresia.fechaInicio_programa,
      firma_base64,
    );

    const base64_contratoPDF = `data:application/pdf;base64,${Buffer.from(
      pdfContrato,
    ).toString("base64")}`;

    const banner1_Attachment = {
      filename: "mailing01.jpg",
      path: "./public/mailingContrato/mailing01.png",
      cid: "mailing1@nodemailer.com", // Identificador único para incrustar la imagen
    };
    const banner2_Attachment = {
      filename: "mailing03.jpg",
      path: "./public/mailingContrato/mailing03.png",
      cid: "mailing2@nodemailer.com", // Identificador único para incrustar la imagen
    };
    const footer_Attachment = {
      filename: "mailing04.jpg",
      path: "./public/mailingContrato/mailing04.png",
      cid: "footer_change@nodemailer.com", // Identificador único para incrustar la imagen
    };
    const mailOptions = {
      from: env.EMAIL_CONTRATOS, // Remitente
      to: dataCliente.email_cli, // Destinatario(s)
      subject: "CONTRATO CHANGE THE SLIM STUDIO", // Asunto
      attachments: [
        banner1_Attachment,
        banner2_Attachment,
        footer_Attachment,
        {
          filename: "contrato_servicios.pdf", // Nombre que verá el destinatario
          content: Buffer.from(pdfContrato), // Los bytes del PDF en forma de Buffer
          contentType: "application/pdf", // Tipo de contenido
        },
      ],
      // Puedes usar `html` en lugar de `text` para enviar un correo con formato HTML
      html: `${mailMembresiaSTRING(
        detalle_membresia.name_pgm,
        `${dataCliente.nombre_cli} ${dataCliente.apPaterno_cli}`,
        id_venta,
        detalleVenta.id_cli,
        detalle_membresia.semanas * 5,
        dayjs.utc(detalle_membresia.fechaInicio_programa).format("DD-MM-YYYY"),
        dayjs(detalle_membresia.fechaFinal).format("DD-MM-YYYY"),
        dayjs.utc(detalle_membresia.time_h).format("hh:mm A"),
        "Boleta",
        venta.numero_transac,
        detalle_membresia.tarifa,
        detalle_membresia.cong,
        detalle_membresia.nutric,
        `${dataEmpleado.nombre_empl} ${dataEmpleado.apPaterno_empl}`,
      )}`,
      headers: {
        "List-Unsubscribe": `<mailto:${env.EMAIL_CONTRATOS}?subject=unsubscribe>`,
      },
    };
    // Envía el correo
    transporterU.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log(error);
      }
      console.log("Correo enviado: " + info.response);
    });

    res.status(200).json({
      ok: true,
      base64_contratoPDF,
    });
  } catch (error) {
    console.log(error, "en mail");

    res.status(501).json({
      ok: false,
      error,
    });
  }
};

const postTraspasoMembresia = async (req = request, res = response) => {
  const {
    id_cli,
    id_empl,
    id_tipo_transaccion,
    numero_transac,
    observacion,
    id_origen,
  } = req.detalle_cli;

  const { id_tt, id_st } = req.body.dataSesiones;
  const {
    tarifa,
    sesiones,
    id_horarioPgm,
    id_pgm,
    fechaInicio_programa,
    fechaFinal,
    time_h,
  } = req.body.formState.dataVenta.detalle_traspaso[0];

  try {
    const venta = new Venta({
      id_cli,
      id_empl,
      id_tipoFactura: id_tipo_transaccion,
      numero_transac,
      observacion,
      id_origen,
      fecha_venta: new Date(),
    });
    await venta.save();
    const detalle_venta_programa = new detalleVenta_membresias({
      id_venta: venta.id,
      id_st: id_st,
      fec_inicio_mem: `${fechaInicio_programa} 00:00:00.000`,
      fec_fin_mem: `${fechaFinal.split("T")[0]}`,
      id_pgm,
      id_tarifa: id_tt,
      horario: time_h,
      tarifa_monto: tarifa,
    });
    await detalle_venta_programa.save();

    res.status(200).json({
      ok: true,
    });
  } catch (error) {
    console.log(error);

    res.status(501).json({
      ok: false,
    });
  }
};
const obtenerVentasMembresiaxEmpresa = async (
  req = request,
  res = response,
) => {
  try {
    const ventas = await Venta.findAll({
      where: { flag: true },
      attributes: [
        "id",
        "id_cli",
        "id_empl",
        "id_tipoFactura",
        "numero_transac",
        "fecha_venta",
      ],
      order: [["id", "DESC"]],
      include: [
        {
          model: Cliente,
          attributes: [
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
          ],
        },
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
        {
          model: detalleVenta_membresias,
          attributes: [
            "id_venta",
            "id_pgm",
            "id_tarifa",
            "horario",
            "id_st",
            "tarifa_monto",
          ],
        },
      ],
    });
  } catch (error) {
    console.log(error);

    res.status(501).json({
      ok: false,
    });
  }
};
const obtenerContratosClientes = async (req = request, res = response) => {
  const { id_enterprice } = req.params;
  try {
    const datacontratosConMembresias = await Venta.findAll({
      where: {
        id_empresa: id_enterprice,
        flag: true,
      },
      order: [["id", "DESC"]],
      include: [
        {
          model: Cliente,
          include: [
            {
              model: ImagePT,
              attributes: ["name_image"],
            },
          ],
          attributes: [
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
            "uid_avatar",
          ],
        },
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
        {
          model: detalleVenta_membresias,
          where: {
            flag: 1,
          },
          attributes: [
            "id_venta",
            "id_pgm",
            "horario",
            "id_st",
            "tarifa_monto",
          ],
          include: [
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
              model: ProgramaTraining,
              attributes: ["name_pgm"],
            },
            {
              model: SemanasTraining,
              attributes: ["semanas_st", "congelamiento_st", "nutricion_st"],
            },
          ],
        },
      ],
    });
    res.status(200).json({
      msg: true,
      datacontratosConMembresias,
    });
  } catch (error) {
    res.status(404).json({
      msg: false,
    });
  }
};
const obtenerClientesVentas = async (req = request, res = response) => {
  try {
    const clientes = await Cliente.findAll({
      attributes: ["id_cli", "nombre_cli"],
      where: {
        flag: true,
      },
      order: [["id_cli", "DESC"]],
      limit: 100,
      include: [
        {
          model: Venta,
          where: {
            fecha_venta: {
              [Op.between]: [new Date("2024-01-21"), new Date("2024-09-21")],
            },
          },
          limit: 2,
          order: [["fecha_venta", "DESC"]],
          required: false,
        },
      ],
      // raw: true,
    });
    res.status(201).json({
      msg: true,
      data: clientes,
    });
  } catch (error) {
    console.log(error);
  }
};
const obtenerClientesxDistritos = async (req = request, res = response) => {
  try {
    const clientes = await Venta.findAll({
      attributes: ["id_cli", "direccion_cli"],
      where: {
        flag: true,
      },
      group: ["direccion_cli"],
      order: [["direccion_cli", "ASC"]],
      include: [
        {
          model: Cliente,
          attributes: ["id_cli", "nombre_cli", "ubigeo_distrito_cli"],
        },
        {
          model: detalleVenta_membresias,
          required: true,
        },
      ],
    });
    res.status(200).json({
      msg: true,
      data: clientes,
    });
  } catch (error) {
    console.log(error);
  }
};
const obtenerUltimasVentasxComprobantes = async (
  req = request,
  res = response,
) => {
  try {
    const { id_comprobante, id_empresa } = req.params;
    const ventas = await Venta.findOne({
      where: {
        id_tipoFactura: id_comprobante,
        id_empresa: id_empresa,
        flag: true,
      },
      order: [["id", "desc"]],
    });
    res.status(201).json({
      msg: "ok",
      ventas,
    });
  } catch (error) {
    console.log(error);
  }
};
const agregarFirmaEnContrato = (req, res) => {
  try {
    const { id_venta } = req.body;
    // const { } =
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: error,
    });
  }
};
const obtenerComparativoResumen = async (req = request, res = response) => {
  const dateParams = req.query.arrayDate || req.query["arrayDate[]"];
  console.log("FECHAS RECIBIDAS (backend):", dateParams);

  if (!dateParams || dateParams.length < 2)
    return res.json({
      ventasProgramas: [],
      ventasTransferencias: [],
      membresias: [],
    });

  const fechaInicio = new Date(dateParams[0]);
  const fechaFin = new Date(dateParams[1]);

  try {
    const detallesRaw = await detalleVenta_membresias.findAll({
      attributes: [
        "id_venta",
        "horario",
        "tarifa_monto",
        "id_tarifa",
        "fec_inicio_mem",
        "fec_fin_mem",
        "id_pgm",
      ],
      order: [["tarifa_monto", "desc"]],
      include: [
        {
          model: ProgramaTraining,
          attributes: ["id_pgm", "name_pgm"],
          where: { flag: true, estado_pgm: true },
          include: [
            {
              model: ImagePT,
              attributes: ["name_image", "height", "width"],
            },
          ],
        },
        {
          model: TarifaTraining,
          attributes: [
            "nombreTarifa_tt",
            "descripcionTarifa_tt",
            "tarifaCash_tt",
            "fecha_inicio",
            "fecha_fin",
            "id_tipo_promocion",
          ],
          as: "tarifa_venta",
        },
        {
          model: SemanasTraining,
          attributes: ["sesiones", "semanas_st"],
        },
        {
          model: Venta,
          attributes: [
            "id_tipoFactura",
            "fecha_venta",
            "id_cli",
            "id",
            "id_origen",
            "observacion",
          ],
          where: {
            fecha_venta: {
              [Op.between]: [fechaInicio, fechaFin],
            },
            flag: true,
          },
          required: true, // INNER JOIN es la clave para filtrar rápido
          include: [
            {
              model: Cliente,
              include: [
                {
                  model: Distritos,
                  as: "ubigeo_nac",
                },
                {
                  model: Distritos,
                  as: "ubigeo_trabajo",
                },
                {
                  model: Marcacion,
                  required: false,
                  where: {
                    tiempo_marcacion_new: {
                      [Op.between]: [
                        new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
                        new Date(fechaFin).setUTCHours(23, 59, 59, 999),
                      ],
                    },
                  },
                },
              ],
            },
            {
              model: Empleado,
              attributes: [
                "id_empl",
                "nombre_empl",
                "apPaterno_empl",
                "apMaterno_empl",
                "estado_empl",
              ],
            },
          ],
        },
      ],
    });

    console.log("detallesRaw.length = ", detallesRaw.length);

    const programasMap = new Map();

    for (const d of detallesRaw) {
      const pgm = d.tb_ProgramaTraining || d.tb_programa_training;
      if (!pgm) continue;

      const pgmId = pgm.id_pgm;
      if (!programasMap.has(pgmId)) {
        programasMap.set(pgmId, {
          name_pgm: pgm.name_pgm,
          id_pgm: pgmId,
          tb_image: pgm.tb_image || null, // ImagePT viene como objeto/array asociado
          detalle_ventaMembresium: [],
        });
      }

      // Estructura esperada por el frontend dentro de detalle_ventaMembresium
      const detalleItem = {
        id_venta: d.id_venta,
        horario: d.horario,
        tarifa_monto: d.tarifa_monto,
        id_tarifa: d.id_tarifa,
        fec_inicio_mem: d.fec_inicio_mem,
        fec_fin_mem: d.fec_fin_mem,
        tarifa_venta: d.tarifa_venta,
        tb_semana_training: d.tb_semana_training,
        tb_ventum: d.tb_ventum,
      };

      programasMap.get(pgmId).detalle_ventaMembresium.push(detalleItem);
    }

    const ventasProgramas = Array.from(programasMap.values());

    const ventasTransferencias = await Venta.findAll({
      order: [["fecha_venta", "DESC"]],
      where: {
        fecha_venta: {
          [Op.between]: [fechaInicio, fechaFin],
        },
        flag: true,
      },
      include: [
        {
          model: detalleVenta_Transferencia,
          as: "venta_venta",
          required: true,
          include: [
            {
              model: Venta,
              as: "venta_transferencia",
              required: true,
              include: [
                {
                  model: detalleVenta_membresias,
                  include: [
                    {
                      model: ProgramaTraining,
                      include: [
                        {
                          model: ImagePT,
                        },
                      ],
                    },
                    {
                      model: SemanasTraining,
                    },
                  ],
                },
                {
                  model: Cliente,
                  include: [
                    {
                      model: Distritos,
                      as: "ubigeo_nac",
                    },
                    {
                      model: Distritos,
                      as: "ubigeo_trabajo",
                    },
                    {
                      model: Marcacion,
                      required: false,
                      where: {
                        tiempo_marcacion_new: {
                          [Op.between]: [
                            new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
                            new Date(fechaFin).setUTCHours(23, 59, 59, 999),
                          ],
                        },
                      },
                    },
                  ],
                },
                {
                  model: Empleado,
                  attributes: [
                    "id_empl",
                    "nombre_empl",
                    "apPaterno_empl",
                    "apMaterno_empl",
                    "estado_empl",
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    let membresias = await detalleVenta_membresias.findAll({
      attributes: [
        "id",
        "id_venta",
        "id_pgm",
        "fec_inicio_mem",
        "horario",
        "fec_fin_mem",
      ],
      order: [["id", "DESC"]],
      include: [
        {
          model: Venta,
          attributes: ["id", "fecha_venta", "id_tipoFactura"],
          where: {
            id_empresa: 598,
            flag: true,
            // Ponemos el filtro de fechas aquí también para no traer ventas viejas
            fecha_venta: {
              [Op.between]: [fechaInicio, fechaFin],
            },
          },
          required: true,
          include: [
            {
              model: Cliente,
              attributes: [
                "id_cli",
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
                "numDoc_cli",
                "nombre_cli",
                "apPaterno_cli",
                "apMaterno_cli",
                "email_cli",
                "tel_cli",
                "ubigeo_distrito_cli",
                "sexo_cli",
                "estCivil_cli",
                "fecha_nacimiento",
              ],
              include: [
                {
                  model: Distritos,
                  as: "ubigeo_nac",
                },
                {
                  model: Distritos,
                  as: "ubigeo_trabajo",
                },
                {
                  model: Marcacion,
                  required: false,
                  where: {
                    tiempo_marcacion_new: {
                      [Op.between]: [
                        new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
                        new Date(fechaFin).setUTCHours(23, 59, 59, 999),
                      ],
                    },
                  },
                },
              ],
            },
            {
              model: Empleado,
              attributes: [
                "id_empl",
                "nombre_empl",
                "apPaterno_empl",
                "apMaterno_empl",
                "estado_empl",
              ],
            },
          ],
        },
        {
          model: ProgramaTraining,
          attributes: ["id_pgm", "name_pgm"],
          where: { estado_pgm: true, flag: true },
          include: [
            {
              model: ImagePT,
              attributes: ["name_image", "width", "height", "id"],
            },
          ],
        },
        {
          model: SemanasTraining,
          attributes: ["id_st", "semanas_st"],
        },
      ],
    });

    // const ventasDeMembresias = await detalleVenta_membresias.findAll({
    //   attributes: [
    //     "horario",
    //     "tarifa_monto",
    //     "id_tarifa",
    //     "fec_inicio_mem",
    //     "fec_fin_mem",
    //   ],
    //   where: {
    //     fec_inicio_mem: {
    //       [Op.between]: [
    //         new Date(fechaInicio).toISOString(),
    //         new Date(fechaFin).toISOString(),
    //       ],
    //     },
    //   },
    //   include: [
    //     {
    //       model: SemanasTraining,
    //       attributes: ["sesiones"],
    //     },
    //     {
    //       model: Venta,
    //       where: {
    //         fecha_venta: {
    //           [Op.between]: [
    //             new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
    //             new Date(fechaFin).setUTCHours(23, 59, 59, 999),
    //           ],
    //         },
    //       },
    //       attributes: [
    //         "id_tipoFactura",
    //         "fecha_venta",
    //         "id_cli",
    //         "id",
    //         "id_origen",
    //       ],
    //       include: [
    //         {
    //           model: Cliente,
    //           include: [
    //             {
    //               model: Distritos,
    //             },
    //             {
    //               model: Marcacion,
    //               where: {
    //                 tiempo_marcacion_new: {
    //                   [Op.between]: [
    //                     new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
    //                     new Date(fechaFin).setUTCHours(23, 59, 59, 999),
    //                   ],
    //                 },
    //               },
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //   ],
    // });
    res.status(200).json({
      ventasProgramas,
      ventasTransferencias,
      membresias,
      // ventasDeMembresias,
    });
  } catch (error) {
    console.log(error);
  }
};

const obtenerComparativoResumenDashboard = async (req = request, res = response) => {
  const dateParams = req.query.arrayDate || req.query['arrayDate[]'];
  // console.log("FECHAS RECIBIDAS (backend - Dashboard):", dateParams);

  if (!dateParams || dateParams.length < 2) return res.json({ ventasProgramas: [], ventasTransferencias: [], membresias: [] });

  const fechaInicio = new Date(dateParams[0]);
  const fechaFin = new Date(dateParams[1]);

  const cacheKey = `compDash_598_${fechaInicio.toISOString().slice(0, 10)}_${fechaFin.toISOString().slice(0, 10)}`;
  const cachedData = comparativoDashboardCache.get(cacheKey);

  if (cachedData) {
    console.log(`[Cache Hit] Comparativo Dashboard: ${cacheKey}`);
    return res.status(200).json(cachedData);
  }
  console.log(`[Cache Miss] Comparativo Dashboard: ${cacheKey}`);

  try {
    // 1. OBTENEMOS LAS MEMBRESÍAS UNA SOLA VEZ (MÁS RÁPIDO)
    const membresiasRaw = await detalleVenta_membresias.findAll({
      attributes: [
        "id", "id_venta", "horario", "tarifa_monto", "id_tarifa",
        "fec_inicio_mem", "fec_fin_mem", "id_pgm"
      ],
      order: [["id", "DESC"]],
      include: [
        {
          model: Venta,
          attributes: ["id_tipoFactura", "fecha_venta", "id_cli", "id", "id_origen", "observacion"],
          where: {
            id_empresa: 598, // Agregado el filtro de empresa aquí para consistencia
            fecha_venta: { [Op.between]: [fechaInicio, fechaFin] },
            flag: true,
          },
          required: true,
        },
        {
          model: ProgramaTraining,
          attributes: ["id_pgm", "name_pgm"],
          where: { flag: true, estado_pgm: true },
          include: [{ model: ImagePT, attributes: ["name_image", "height", "width"] }],
        },
        {
          model: TarifaTraining,
          as: "tarifa_venta",
          attributes: ["nombreTarifa_tt", "descripcionTarifa_tt", "tarifaCash_tt", "fecha_inicio", "fecha_fin", "id_tipo_promocion"],
          required: false
        },
        {
          model: SemanasTraining,
          attributes: ["sesiones", "semanas_st", "id_st"],
        },
      ],
    });

    const membresiasSerialized = membresiasRaw.map(mem => mem.get({ plain: true }));

    // 2. AGRUPAMOS EN MEMORIA (Reemplaza a la primera consulta original)
    const programasMap = new Map();

    for (const d of membresiasSerialized) {
      // Sequelize usa la convención de nombres basada en el modelo
      const pgm = d.tb_programa_training || d.tb_ProgramaTraining;
      if (!pgm) continue;

      const pgmId = pgm.id_pgm;

      if (!programasMap.has(pgmId)) {
        programasMap.set(pgmId, {
          name_pgm: pgm.name_pgm,
          id_pgm: pgmId,
          tb_image: pgm.tb_image || null,
          detalle_ventaMembresium: [],
        });
      }

      // Creamos el item limpio sin duplicar toda la estructura
      programasMap.get(pgmId).detalle_ventaMembresium.push({
        id_venta: d.id_venta,
        horario: d.horario,
        tarifa_monto: d.tarifa_monto,
        id_tarifa: d.id_tarifa,
        fec_inicio_mem: d.fec_inicio_mem,
        fec_fin_mem: d.fec_fin_mem,
        tarifa_venta: d.tarifa_venta,
        tb_semana_training: d.tb_semana_training || d.tb_semanas_training,
        tb_ventum: d.tb_ventum || d.tb_venta,
      });
    }

    const ventasProgramas = Array.from(programasMap.values());

    // 3. OBTENEMOS TRANSFERENCIAS (Se mantiene igual, pero evalúa si necesitas TANTOS includes anidados si es solo para un dashboard)
    const ventasTransferencias = await Venta.findAll({
      order: [["fecha_venta", "DESC"]],
      attributes: ["id", "fecha_venta"], // LIMITE LOS ATRIBUTOS
      where: {
        fecha_venta: { [Op.between]: [fechaInicio, fechaFin] },
        flag: true,
      },
      include: [
        {
          model: detalleVenta_Transferencia,
          as: "venta_venta",
          required: true,
          attributes: ["id", "id_venta", "id_membresia"], // LIMITAR
          include: [
            {
              model: Venta,
              as: "venta_transferencia",
              required: true,
              attributes: ["id"], // LIMITAR
              include: [
                {
                  model: detalleVenta_membresias,
                  attributes: ["id", "id_pgm"], // LIMITAR
                  include: [
                    {
                      model: ProgramaTraining,
                      attributes: ["id_pgm", "name_pgm"],
                      include: [{ model: ImagePT, attributes: ["name_image"] }],
                    },
                    { model: SemanasTraining, attributes: ["semanas_st"] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const ventasTransferenciasSerialized = ventasTransferencias.map(v => v.get({ plain: true }));

    // 4. RESPUESTA
    // Al usar membresiasRaw para membresias, reutilizamos los datos de la primera consulta.
    const responsePayload = {
      ventasProgramas,
      ventasTransferencias: ventasTransferenciasSerialized,
      membresias: membresiasSerialized,
    };

    comparativoDashboardCache.set(cacheKey, responsePayload);

    res.status(200).json(responsePayload);

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

const getVencimientosPorMes = async (req = request, res = response) => {
  const { year, id_empresa, id_st } = req.query;

  try {
    if (!year) return res.status(400).json({ ok: false, msg: "Falta year" });

    const empresaID = Number(id_empresa) || 598;
    const targetYear = Number(year);

    const cacheKey = `vencimientos_${empresaID}_${targetYear}_${id_st || 'all'}`;
    const cachedData = vencimientosResumenCache.get(cacheKey);

    if (cachedData) {
      console.log(`[Cache Hit] Vencimientos: ${cacheKey}`);
      return res.status(200).json(cachedData);
    }
    console.log(`[Cache Miss] Vencimientos: ${cacheKey}`);

    const startWindow = new Date(`${targetYear - 2}-01-01`);


    const [renovacionesDB, membresiasDBRaw] = await Promise.all([
      detalleVenta_membresias.findAll({
        attributes: ["id"],
        where: { flag: true },
        include: [
          {
            model: Venta,
            attributes: ["fecha_venta"],
            where: {
              flag: true,
              id_empresa: empresaID,
              id_origen: 691,
              fecha_venta: {
                [Op.between]: [
                  new Date(`${targetYear}-01-01T00:00:00`),
                  new Date(`${targetYear}-12-31T23:59:59`),
                ],
              },
            },
            required: true,
          },
        ],
        raw: true,
        nest: true,
      }),
      detalleVenta_membresias.findAll({
        attributes: [
          "fec_fin_mem",
          "fec_fin_mem_oftime",
          "fec_fin_mem_viejo",
          "tarifa_monto",
        ],
        where: {
          flag: true,
          ...(id_st && { id_st: id_st }),
        },
        include: [
          {
            model: Venta,
            attributes: ["id", "fecha_venta", "id_cli"],
            where: {
              flag: true,
              id_empresa: empresaID,
              fecha_venta: { [Op.gte]: startWindow },
            },
            required: true,
          },
          { model: SemanasTraining, attributes: ["semanas_st"] },
          { model: ExtensionMembresia, attributes: ["dias_habiles", "flag"] },
        ],
        // ⚠️ Sin raw:true porque tb_extension_membresia es hasMany y necesita quedar como array
      }),
    ]);

    // PREVENIR CRASHEO DEL CACHÉ: Serializamos el array de instancias de Sequelize a JSON puro
    // (Node-cache falla intentando clonar objetos de conexión TCP dentro del modelo de Sequelize)
    const membresiasDB = membresiasDBRaw.map(mem => mem.get({ plain: true }));

    const mapRenovaciones = {};
    renovacionesDB.forEach((detalle) => {
      const fecha = detalle.tb_ventum?.fecha_venta;
      if (fecha) {
        const d = new Date(fecha);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        mapRenovaciones[k] = (mapRenovaciones[k] || 0) + 1;
      }
    });

    const mapVencimientos = {};
    const clientesMaxDate = new Map();

    membresiasDB.forEach((mem) => {
      const fechaVenta = mem.tb_ventum
        ? new Date(mem.tb_ventum.fecha_venta)
        : null;
      let inicio = mem.fec_inicio_mem
        ? new Date(mem.fec_inicio_mem)
        : fechaVenta;
      if (!inicio) return;

      let finBase = null;
      const semanas = mem.tb_semana_training?.semanas_st;
      if (semanas) {
        finBase = new Date(inicio);
        finBase.setDate(finBase.getDate() + semanas * 7);
      } else {
        finBase = mem.fec_fin_mem
          ? new Date(mem.fec_fin_mem)
          : mem.fec_fin_mem_oftime
            ? new Date(mem.fec_fin_mem_oftime)
            : null;
      }
      if (!finBase) return;

      // Sumar extensiones
      let diasExtension = 0;
      if (mem.tb_extension_membresia?.length > 0) {
        mem.tb_extension_membresia.forEach((ext) => {
          if (ext.flag && !isNaN(parseInt(ext.dias_habiles))) {
            diasExtension += parseInt(ext.dias_habiles);
          }
        });
      }
      const finEfectiva = new Date(finBase);
      finEfectiva.setDate(finEfectiva.getDate() + diasExtension);

      // 1. Vencimientos por Mes
      if (finEfectiva.getFullYear() === targetYear) {
        const k = `${finEfectiva.getFullYear()}-${String(finEfectiva.getMonth() + 1).padStart(2, "0")}`;
        mapVencimientos[k] = (mapVencimientos[k] || 0) + 1;
      }

      // 2. Cartera Inicial
      const idCli = mem.tb_ventum.id_cli;
      if (
        !clientesMaxDate.has(idCli) ||
        finEfectiva > clientesMaxDate.get(idCli)
      ) {
        clientesMaxDate.set(idCli, finEfectiva);
      }
    });

    // 3. CALCULAR SALDO INICIAL
    let carteraInicial = 0;
    const inicioDeAno = new Date(`${targetYear}-01-01`);

    clientesMaxDate.forEach((fechaFin) => {
      if (fechaFin < inicioDeAno) {
        carteraInicial++;
      }
    });

    // 4. ARMAR DATA FINAL
    let acumuladoCartera = carteraInicial;
    const mesesLabels = [
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "12",
    ];
    const mesesNombres = [
      "ENE",
      "FEB",
      "MAR",
      "ABR",
      "MAY",
      "JUN",
      "JUL",
      "AGO",
      "SEPT",
      "OCT",
      "NOV",
      "DIC",
    ];

    const dataFinal = mesesLabels.map((m, idx) => {
      const mesKey = `${targetYear}-${m}`;
      const vencimientos = mapVencimientos[mesKey] || 0;
      const renovaciones = mapRenovaciones[mesKey] || 0;
      const pendiente = vencimientos - renovaciones;

      const porcentaje =
        vencimientos === 0
          ? 0
          : ((renovaciones / vencimientos) * 100).toFixed(1);

      acumuladoCartera += pendiente;

      return {
        Mes: mesesNombres[idx],
        MÉTRICA: mesesNombres[idx],
        "RENOVACIONES DEL MES": renovaciones,
        "RENOVACIONES %": parseFloat(porcentaje),
        "VENCIMIENTOS POR MES": vencimientos,
        "PENDIENTE DE RENOVACIONES": pendiente,
        "ACUMULADO CARTERA": acumuladoCartera,
      };
    });

    const responsePayload = { ok: true, year: targetYear, cartera_inicial: carteraInicial, data: dataFinal };
    vencimientosResumenCache.set(cacheKey, responsePayload);

    res.status(200).json(responsePayload);

  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, msg: "Error interno" });
  }
};
const obtenerComparativoTotal = async (req = request, res = response) => {
  try {
    const ventasProgramas = await ProgramaTraining.findAll({
      attributes: ["name_pgm", "id_pgm"],
      where: { flag: true, estado_pgm: true },
      distinct: true,
      include: [
        {
          model: ImagePT,
          attributes: ["name_image", "height", "width"],
        },
        {
          model: detalleVenta_membresias,
          order: [["tarifa_monto", "desc"]],
          attributes: [
            "id_venta",
            "horario",
            "tarifa_monto",
            "id_tarifa",
            "fec_inicio_mem",
            "fec_fin_mem",
          ],
          include: [
            {
              model: TarifaTraining,
              attributes: [
                "nombreTarifa_tt",
                "descripcionTarifa_tt",
                "tarifaCash_tt",
                "fecha_inicio",
                "fecha_fin",
                "id_tipo_promocion",
              ],
              as: "tarifa_venta",
            },
            {
              model: SemanasTraining,
              attributes: ["sesiones", "semanas_st"],
            },
            {
              model: Venta,
              attributes: [
                "id_tipoFactura",
                "fecha_venta",
                "id_cli",
                "id",
                "id_origen",
                "observacion",
              ],
              // include: [
              // {
              //   model: Cliente,
              //   include: [
              //     {
              //       model: Distritos,
              //       as: "ubigeo_nac",
              //     },
              //     {
              //       model: Distritos,
              //       as: "ubigeo_trabajo",
              //     },
              //   ],
              // },
              // {
              //   model: Empleado,
              //   attributes: [
              //     "nombre_empl",
              //     "apPaterno_empl",
              //     "apMaterno_empl",
              //     "estado_empl",
              //   ],
              // },
              // ],
            },
          ],
        },
      ],
    });
    res.status(200).json({
      ventasProgramas,
    });
  } catch (error) {
    console.log(error);
  }
};

const obtenerComparativoResumenClientes = async (
  req = request,
  res = response,
) => {
  const { arrayDate } = req.query;

  const fechaInicio = arrayDate[0];
  const fechaFin = arrayDate[1];

  try {
    const ventasProgramas = await ProgramaTraining.findAll({
      attributes: ["name_pgm", "id_pgm"],
      where: { flag: true, estado_pgm: true },
      distinct: true,
      include: [
        {
          model: ImagePT,
          attributes: ["name_image", "height", "width"],
        },
        {
          model: detalleVenta_membresias,
          attributes: [
            "id_venta",
            "horario",
            "tarifa_monto",
            "id_tarifa",
            "fec_inicio_mem",
            "fec_fin_mem",
          ],
          include: [
            {
              model: TarifaTraining,
              attributes: [
                "nombreTarifa_tt",
                "descripcionTarifa_tt",
                "tarifaCash_tt",
                "fecha_inicio",
                "fecha_fin",
                "id_tipo_promocion",
              ],
              as: "tarifa_venta",
            },
            {
              model: SemanasTraining,
              attributes: ["sesiones"],
            },
            {
              model: Venta,
              attributes: [
                "id_tipoFactura",
                "fecha_venta",
                "id_cli",
                "id",
                "id_origen",
                "observacion",
              ],
              where: {
                fecha_venta: {
                  [Op.between]: [
                    new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
                    new Date(fechaFin).setUTCHours(23, 59, 59, 999),
                  ],
                },
              },
              include: [
                {
                  model: Cliente,
                  include: [
                    {
                      model: Distritos,
                    },
                    // {
                    //   model: Marcacion,
                    //   required: false,
                    //   where: {
                    //     tiempo_marcacion_new: {
                    //       [Op.between]: [
                    //         new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
                    //         new Date(fechaFin).setUTCHours(23, 59, 59, 999),
                    //       ],
                    //     },
                    //   },
                    // },
                  ],
                },
                {
                  model: Empleado,
                },
              ],
            },
          ],
        },
      ],
    });
    const ventasTransferencias = await Venta.findAll({
      order: [["fecha_venta", "DESC"]],
      where: {
        fecha_venta: {
          [Op.between]: [
            new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
            new Date(fechaFin).setUTCHours(23, 59, 59, 999),
          ],
        },
        flag: true,
      },
      include: [
        {
          model: detalleVenta_Transferencia,
          as: "venta_venta",
          required: true,
          include: [
            {
              model: Venta,
              as: "venta_transferencia",
              required: true,
              include: [
                {
                  model: detalleVenta_membresias,
                  include: [
                    {
                      model: ProgramaTraining,
                      include: [
                        {
                          model: ImagePT,
                        },
                      ],
                    },
                    {
                      model: SemanasTraining,
                    },
                  ],
                },
                {
                  model: Cliente,
                  include: [
                    {
                      model: Distritos,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    let membresias = await detalleVenta_membresias.findAll({
      attributes: [
        "id",
        "id_venta",
        "id_pgm",
        "fec_inicio_mem",
        "horario",
        "fec_fin_mem",
      ],
      order: [["id", "DESC"]],
      include: [
        {
          model: Venta,
          attributes: ["id", "fecha_venta", "id_tipoFactura"],
          where: { id_empresa: 598, flag: true },
          include: [
            {
              model: Cliente,
              attributes: [
                "id_cli",
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
                "numDoc_cli",
                "nombre_cli",
                "apPaterno_cli",
                "apMaterno_cli",
                "email_cli",
                "tel_cli",
                "ubigeo_distrito_cli",
              ],
              include: [
                {
                  model: Distritos,
                },
                {
                  model: Marcacion,
                  required: false,
                  where: {
                    tiempo_marcacion_new: {
                      [Op.between]: [
                        new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
                        new Date(fechaFin).setUTCHours(23, 59, 59, 999),
                      ],
                    },
                  },
                },
              ],
            },
          ],
        },
        {
          model: ProgramaTraining,
          attributes: ["id_pgm", "name_pgm"],
          where: { estado_pgm: true, flag: true },
          include: [
            {
              model: ImagePT,
              attributes: ["name_image", "width", "height", "id"],
            },
          ],
        },
        {
          model: SemanasTraining,
          attributes: ["id_st", "semanas_st"],
        },
      ],
    });

    // const ventasDeMembresias = await detalleVenta_membresias.findAll({
    //   attributes: [
    //     "horario",
    //     "tarifa_monto",
    //     "id_tarifa",
    //     "fec_inicio_mem",
    //     "fec_fin_mem",
    //   ],
    //   where: {
    //     fec_inicio_mem: {
    //       [Op.between]: [
    //         new Date(fechaInicio).toISOString(),
    //         new Date(fechaFin).toISOString(),
    //       ],
    //     },
    //   },
    //   include: [
    //     {
    //       model: SemanasTraining,
    //       attributes: ["sesiones"],
    //     },
    //     {
    //       model: Venta,
    //       where: {
    //         fecha_venta: {
    //           [Op.between]: [
    //             new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
    //             new Date(fechaFin).setUTCHours(23, 59, 59, 999),
    //           ],
    //         },
    //       },
    //       attributes: [
    //         "id_tipoFactura",
    //         "fecha_venta",
    //         "id_cli",
    //         "id",
    //         "id_origen",
    //       ],
    //       include: [
    //         {
    //           model: Cliente,
    //           include: [
    //             {
    //               model: Distritos,
    //             },
    //             {
    //               model: Marcacion,
    //               where: {
    //                 tiempo_marcacion_new: {
    //                   [Op.between]: [
    //                     new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
    //                     new Date(fechaFin).setUTCHours(23, 59, 59, 999),
    //                   ],
    //                 },
    //               },
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //   ],
    // });
    res.status(200).json({
      ventasProgramas,
      ventasTransferencias,
      membresias,
      // ventasDeMembresias,
    });
  } catch (error) {
    console.log(error);
  }
};

const obtenerComparativoResumenxMES = async (req = request, res = response) => {
  const { anio, mes } = req.query;
  // Define mes y año
  const year = anio;
  const month = mes; // Octubre (número del mes en formato 1-12)

  const fechaInicio = new Date((year, month - 1, 1, 0, 0, 0, 0)); // Primer día del mes
  const fechaFin = new Date((year, month, 0, 23, 59, 59, 999)); // Último día del mes

  try {
    const ventasProgramas = await ProgramaTraining.findAll({
      attributes: ["name_pgm", "id_pgm"],
      where: { flag: true, estado_pgm: true },
      include: [
        {
          model: ImagePT,
          attributes: ["name_image", "height", "width"],
        },
        {
          model: detalleVenta_membresias,
          attributes: ["horario", "tarifa_monto"],
          // where: {
          //   tarifa_monto: {
          //     [Op.ne]: 0.0, // Excluye los registros con id_tipoFactura igual a 84
          //   },
          // },
          required: true,
          include: [
            {
              model: SemanasTraining,
              attributes: ["sesiones"],
            },
            {
              model: Venta,
              attributes: [
                "id_tipoFactura",
                "fecha_venta",
                "id_cli",
                "id",
                "id_origen",
              ],
              where: {
                flag: true,
                fecha_venta: {
                  [Op.between]: [fechaInicio, fechaFin], // <-- Aquí usamos objetos Date directamente
                },
              },
              include: [
                {
                  model: Cliente,
                  include: [
                    {
                      model: Distritos,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          model: detalleVenta_membresias,
          attributes: ["horario", "tarifa_monto"],
          // where: {
          //   tarifa_monto: {
          //     [Op.ne]: 0.0, // Excluye los registros con id_tipoFactura igual a 84
          //   },
          // },
          required: true,
          include: [
            {
              model: SemanasTraining,
              attributes: ["sesiones"],
            },
            {
              model: Venta,
              attributes: [
                "id_tipoFactura",
                "fecha_venta",
                "id_cli",
                "id",
                "id_origen",
              ],
              where: {
                flag: true,
                fecha_venta: {
                  [Op.between]: [
                    new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
                    new Date(fechaFin).setUTCHours(23, 59, 59, 999),
                  ],
                },
              },
              include: [
                {
                  model: Cliente,
                  include: [
                    {
                      model: Distritos,
                    },
                  ],
                },
              ],
            },
          ],
        },
        // {
        //   model: detalleVenta_membresias,
        //     include: [
        //       {
        //         model: Venta,
        //         as: "venta_venta",
        //         include: [
        //           {
        //             model: detalleVenta_Transferencia,
        //           },
        //         ],
        //       },
        //     ],
        // },
        // {
        //   model: detalleVenta_membresias,
        //   as: "venta_transferencia",
        //   include: [
        //     {
        //       model: Venta,
        //       as: "venta_venta",
        //       include: [
        //         {
        //           model: detalleVenta_Transferencia,
        //         },
        //       ],
        //     },
        //   ],
        // },
        // {
        //   model: detalleVenta_Transferencia,
        //   as: "venta_venta",
        //   attributes: [
        //     "id_venta",
        //     "id_membresia",
        //     "tarifa_monto",
        //     "horario",
        //     "fec_inicio_mem",
        //     "fec_fin_mem",
        //   ],
        //   include: [
        //     {
        //       model: Venta,
        //       as: "venta_transferencia",
        //       include: [
        //         {
        //           model: detalleVenta_membresias,
        //           include: [
        //             {
        //               model: ProgramaTraining,
        //               attributes: ["name_pgm"],
        //             },
        //             {
        //               model: SemanasTraining,
        //               attributes: [
        //                 "semanas_st",
        //                 "congelamiento_st",
        //                 "nutricion_st",
        //               ],
        //             },
        //           ],
        //         },
        //       ],
        //     },
        //   ],
        // },
      ],
    });
    res.status(201).json({
      ventasProgramas,
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      error: error,
    });
  }
};

const obtenerEstadoResumen = async (req = request, res = response) => {
  const { arrayDate, id_empresa } = req.query;
  const { id_origen } = req.params;
  console.log(id_origen);

  const fechaInicio = arrayDate[0];
  const fechaFin = arrayDate[1];

  try {
    let ventasProgramasEstado = null;
    if (id_origen == "traspaso") {
      console.log("en traspaso");

      ventasProgramasEstado = await ProgramaTraining.findAll({
        attributes: ["name_pgm", "id_pgm"],
        where: { flag: true, estado_pgm: true },
        include: [
          {
            model: ImagePT,
            attributes: ["name_image", "height", "width"],
          },
          {
            model: detalleVenta_membresias,
            attributes: ["horario", "tarifa_monto"],
            // where: {
            // tarifa_monto: {
            //   [Op.ne]: 0.0, // Excluye los registros con id_tipoFactura igual a 84
            // },
            // },

            include: [
              {
                model: SemanasTraining,
                attributes: ["sesiones"],
              },
              {
                model: Venta,
                attributes: ["fecha_venta", "id_cli", "id"],
                where: {
                  fecha_venta: {
                    [Op.between]: [
                      new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
                      new Date(fechaFin).setUTCHours(23, 59, 59, 999),
                    ],
                  },
                  id_tipoFactura: 701,
                },
                // include: [

                // ]
              },
            ],
          },
        ],
      });
    }
    if (id_origen == "transferencia") {
      console.log("en transferencia");
      ventasProgramasEstado = await ProgramaTraining.findAll({
        attributes: ["name_pgm", "id_pgm"],
        where: { flag: true, estado_pgm: true },
        include: [
          {
            model: ImagePT,
            attributes: ["name_image", "height", "width"],
          },
          {
            model: detalleVenta_Transferencia,
            attributes: ["horario", "tarifa_monto"],
            where: {
              tarifa_monto: {
                [Op.ne]: 0.0, // Excluye los registros con id_tipoFactura igual a 84
              },
            },

            include: [
              {
                model: Venta,
                as: "venta_venta",
                attributes: ["fecha_venta", "id_cli", "id"],
                where: {
                  fecha_venta: {
                    [Op.between]: [
                      new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
                      new Date(fechaFin).setUTCHours(23, 59, 59, 999),
                    ],
                  },
                  id_tipoFactura: 701,
                },
                // include: [

                // ]
              },
            ],
          },
        ],
      });
    }
    if (id_origen == "nuevos") {
      console.log("en nuevo");
      ventasProgramasEstado = await ProgramaTraining.findAll({
        attributes: ["name_pgm", "id_pgm"],
        where: { flag: true, estado_pgm: true },
        include: [
          {
            model: ImagePT,
            attributes: ["name_image", "height", "width"],
          },
          {
            model: detalleVenta_membresias,
            attributes: ["horario", "tarifa_monto"],
            where: {
              tarifa_monto: {
                [Op.ne]: 0.0, // Excluye los registros con id_tipoFactura igual a 84
              },
            },
            required: true,
            include: [
              {
                model: SemanasTraining,
                attributes: ["sesiones"],
              },
              {
                model: Venta,
                attributes: ["fecha_venta", "id_cli", "id"],
                where: {
                  fecha_venta: {
                    [Op.between]: [
                      new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
                      new Date(fechaFin).setUTCHours(23, 59, 59, 999),
                    ],
                  },
                  id_empresa: id_empresa,
                  id_origen: {
                    [Op.notIn]: [691, 692],
                  },
                  id_tipoFactura: {
                    [Op.notIn]: 701,
                  },
                },
              },
            ],
          },
        ],
      });
    }
    if (id_origen == 691 || id_origen == 692) {
      console.log("en reno o en rei");
      ventasProgramasEstado = await ProgramaTraining.findAll({
        attributes: ["name_pgm", "id_pgm"],
        where: { flag: true, estado_pgm: true },
        include: [
          {
            model: ImagePT,
            attributes: ["name_image", "height", "width"],
          },
          {
            model: detalleVenta_membresias,
            attributes: ["horario", "tarifa_monto"],
            // where: {
            // tarifa_monto: {
            //   [Op.ne]: 0.0, // Excluye los registros con id_tipoFactura igual a 84
            // },
            // },

            include: [
              {
                model: SemanasTraining,
                attributes: ["sesiones"],
              },
              {
                model: Venta,
                attributes: ["fecha_venta", "id_cli", "id"],
                where: {
                  fecha_venta: {
                    [Op.between]: [
                      new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
                      new Date(fechaFin).setUTCHours(23, 59, 59, 999),
                    ],
                  },
                  id_origen: id_origen,
                },
                // include: [

                // ]
              },
            ],
          },
        ],
      });
    }

    res.status(200).json({
      ventasProgramasEstado,
    });
  } catch (error) {
    console.log(error);
  }
};

const obtenerVentasDeClientesNuevos = async (req = request, res = response) => {
  try {
    const { arrayDate, id_empresa } = req.query;

    const fechaInicio = arrayDate[0];
    const fechaFin = arrayDate[1];

    const ventasProgramasEstado = await ProgramaTraining.findAll({
      attributes: ["name_pgm", "id_pgm"],
      where: { flag: true, estado_pgm: true, id_pgm: 2 },
      raw: true,
      include: [
        {
          model: ImagePT,
          attributes: ["name_image", "height", "width"],
        },
        {
          model: detalleVenta_membresias,
          attributes: ["horario", "tarifa_monto"],
          where: {
            tarifa_monto: {
              [Op.ne]: 0.0, // Excluye los registros con id_tipoFactura igual a 84
            },
          },
          include: [
            {
              model: SemanasTraining,
              attributes: ["sesiones"],
            },
            {
              model: Venta,
              attributes: ["fecha_venta", "id_cli", "id"],
              where: {
                fecha_venta: {
                  [Op.between]: [
                    new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
                    new Date(fechaFin).setUTCHours(23, 59, 59, 999),
                  ],
                },
                id_empresa: id_empresa,
                // id_origen: {
                //   [Op.notIn]: [691, 692],
                // },
                // id_tipoFactura: {
                //   [Op.notIn]: 701,
                // },
              },
            },
          ],
        },
      ],
    });

    res.status(200).json({
      ventasProgramasEstado,
    });
  } catch (error) {
    console.log(error);
  }
};

const obtenerTransferenciasxFecha = async (req = request, res = response) => {
  const { arrayDate } = req.query;
  try {
    const dataTransferencias = await Venta.findAll({
      order: [["fecha_venta", "DESC"]],
      where: {
        fecha_venta: {
          [Op.between]: [
            new Date(arrayDate[0]).setUTCHours(0, 0, 0, 0),
            new Date(arrayDate[1]).setUTCHours(23, 59, 59, 999),
          ],
        },
        flag: true,
      },
      include: [
        {
          model: Cliente,
          include: [
            {
              model: Distritos,
            },
          ],
          // attributes: [
          //   [
          //     Sequelize.fn(
          //       "CONCAT",
          //       Sequelize.col("nombre_cli"),
          //       " ",
          //       Sequelize.col("apPaterno_cli"),
          //       " ",
          //       Sequelize.col("apMaterno_cli")
          //     ),
          //     "nombres_apellidos_cli_vent",
          //   ],
          // ],
        },
        {
          model: detalleVenta_Transferencia,
          as: "venta_venta",
          required: true,
          include: [
            {
              model: Venta,
              as: "venta_transferencia",
              required: true,
              include: [
                {
                  model: detalleVenta_membresias,
                  include: [
                    {
                      model: ProgramaTraining,
                    },
                    {
                      model: SemanasTraining,
                    },
                  ],
                },
                {
                  model: Cliente,
                  include: [
                    {
                      model: Distritos,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    res.status(200).json({
      transferencia: dataTransferencias,
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      error: "error",
    });
  }
};

const obtenerVentasxTipoFactura = async (req = request, res = response) => {};

const obtenerClientesConMembresia = async (req = request, res = response) => {
  try {
    const clientesConMembresia = await Cliente.findAll({
      attributes: [
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
      ],
      limit: 20,
      order: [["id_cli", "DESC"]],
      include: [
        {
          model: Venta,
          include: [
            {
              model: detalleVenta_membresias,
              required: true,
              include: [
                {
                  model: ProgramaTraining,
                },
                {
                  model: SemanasTraining,
                },
              ],
            },
          ],
        },
      ],
    });
    res.status(200).json({
      clientesConMembresia,
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      error: "error",
    });
  }
};
const obtenerTransferenciasResumenxMes = async (
  req = request,
  res = response,
) => {
  const { anio, mes } = req.query;
  // Define mes y año
  const year = anio;
  const month = mes; // Octubre (número del mes en formato 1-12)

  const fechaInicio = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)); // Primer día del mes
  const fechaFin = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)); // Último día del mes

  try {
    const dataTransferencias = await Venta.findAll({
      order: [["fecha_venta", "DESC"]],
      where: {
        fecha_venta: {
          [Op.between]: [
            new Date(fechaInicio).setUTCHours(0, 0, 0, 0),
            new Date(fechaFin).setUTCHours(23, 59, 59, 999),
          ],
        },
        flag: true,
      },
      attributes: ["id"],
      include: [
        {
          model: detalleVenta_Transferencia,
          as: "venta_venta",
          required: true,
          include: [
            {
              model: Venta,
              as: "venta_transferencia",
              required: true,
              include: [
                {
                  model: detalleVenta_membresias,
                  include: [
                    {
                      model: ProgramaTraining,
                      include: [
                        {
                          model: ImagePT,
                        },
                      ],
                    },
                    {
                      model: SemanasTraining,
                    },
                  ],
                },
                {
                  model: Cliente,
                  include: [
                    {
                      model: Distritos,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    res.status(200).json({
      transferencia: dataTransferencias,
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      error: "error",
    });
  }
};

const postCambioPrograma = async (req = request, res = response) => {
  try {
    // const { id_cli, id_venta, id_pgm, fecha_cambio } = req.body;
    const cambioPrograma = new detalle_cambioPrograma(req.body);
    res.status(201).json({
      message: "Programa cambiado exitosamente",
      cambioPrograma,
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      error: "error",
    });
  }
};

const obtenerMembresias = async (req = request, res = response) => {
  const dateRanges = ["2024-09-01 00:00:00", "2025-12-30 00:00:00"];

  try {
    const membresias = await Venta.findAll({
      where: {
        fecha_venta: {
          [Op.between]: [
            new Date(dateRanges[0]).setUTCHours(0, 0, 0, 0),
            new Date(dateRanges[1]).setUTCHours(23, 59, 59, 999),
          ], // Suponiendo que fecha_inicial y fecha_final son variables con las fechas deseadas
        },
        flag: true,
      },
      include: [
        {
          model: detalleVenta_membresias,
          flag: true,
          required: true,
        },
        {
          model: Cliente,
          attributes: [
            "id_cli",
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
          ],
        },
      ],
    });
    console.log(membresias, "memmmmmm");

    res.status(201).json({
      message: "Programa cambiado exitosamente",
      membresias,
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      error: "error",
    });
  }
};
const obtenerMarcacionesClientexMembresias = async (
  req = request,
  res = response,
) => {
  try {
    const year = 2024;
    const month = 9; // Octubre (número del mes en formato 1-12)
    const { id_enterprice } = req.params;
    const membresias = await Venta.findAll({
      order: [["fecha_venta", "DESC"]],
      where: {
        id_empresa: id_enterprice,
        flag: true,
      },
      include: [
        {
          model: Cliente,
          attributes: [
            "id_cli",
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
          include: [
            {
              model: Marcacion,
              attributes: [
                "tiempo_marcacion",
                "tiempo_marcacion_new",
                "dni",
                "nombre_usuario",
                "apellido_usuario",
              ],
              required: false,
            },
            {
              model: Cita,
              where: { status_cita: 501 },
              attributes: ["fecha_init", "fecha_final"],
              required: false,
            },
          ],
        },
        {
          model: detalleVenta_membresias,
          required: true,
          attributes: ["fec_inicio_mem", "fec_fin_mem", "horario", "id_pgm"],
          include: [
            {
              model: ProgramaTraining,
              attributes: ["name_pgm"],
              include: [{ model: ImagePT }],
            },
            {
              model: SemanasTraining,
              attributes: ["sesiones", "nutricion_st"],
            },
          ],
        },
      ],
    });
    res.status(201).json({
      membresias,
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      error: "error",
    });
  }
};

const obtenerMembresiasxUIDcliente = async (req, res) => {
  try {
    const { id_cli } = req.params;
    const membresias = await Venta.findAll({
      order: [["fecha_venta", "DESC"]],
      where: {
        id_cli: id_cli,
        flag: true,
      },
      include: [
        {
          model: detalleVenta_membresias,
          required: true,
          attributes: [
            "fec_inicio_mem",
            "fec_fin_mem",
            "horario",
            "id_pgm",
            "tarifa_monto",
          ],
          include: [
            {
              model: ProgramaTraining,
              attributes: ["name_pgm"],
              include: [{ model: ImagePT }],
            },
            {
              model: SemanasTraining,
              attributes: [
                "semanas_st",
                "sesiones",
                "nutricion_st",
                "congelamiento_st",
              ],
            },
            {
              model: ExtensionMembresia,
              attributes: [
                "id",
                "tipo_extension",
                "extension_inicio",
                "extension_fin",
                "observacion",
              ],
            },
          ],
        },
      ],
    });
    res.status(201).json({
      membresias: membresias,
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      error: "error",
    });
  }
};

const putVentaxId = async (req, res) => {
  try {
    const { id } = req.params;
    const venta = await Venta.findOne({ where: { id: id } });
    await venta.update(req.body);
    res.status(201).json({
      error: "SUCCESS",
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      error: "error",
    });
  }
};
const postVentaProductos = async (req, res) => {
  try {
    const { id_venta } = req.params;
    const { id_producto, cantidad, precio_unitario, tarifa_monto, id_empl } =
      req.body;
    const tipoVenta = new detalleVenta_producto({
      cantidad,
      tarifa_monto,
      id_empl,
      id_producto,
      id_venta,
    });
    await tipoVenta.save();
    res.status(201).json({
      tipoVenta,
      msg: "success",
    });
  } catch (error) {
    console.log(error);
  }
};
const postVentaServicios = async (req, res) => {
  try {
    const { id_venta } = req.params;
    const { id_servicio, cantidad, tarifa_monto, id_empl } = req.body;
    const tipoVenta = new detalleventa_servicios({
      cantidad,
      tarifa_monto,
      id_empl,
      id_servicio,
      id_venta,
    });
    await tipoVenta.save();
    res.status(201).json({
      tipoVenta,
      msg: "success",
    });
  } catch (error) {
    console.log(error);
  }
};
const postComanda = async (req = request, res = response) => {
  try {
    const { id_empresa } = req.params;
    const {
      id_cli,
      observacion,
      status_remove,
      fecha_venta,
      detalle = [],
    } = req.body;

    if (!Array.isArray(detalle) || detalle.length === 0) {
      return res
        .status(400)
        .json({ ok: false, msg: "detalle vacío o inválido" });
    }

    // Crear la venta
    const venta = await Venta.create({
      id_cli,
      observacion,
      status_remove,
      fecha_venta,
      id_origen: 0,
      numero_transac: null,
      id_empresa,
      id_tipoFactura: null,
      flag: true,
    });

    // Preparar arrays para bulkCreate
    const productos = detalle
      .filter((it) => it.clase === "producto")
      .map((it) => ({
        id_venta: venta.id,
        id_producto: it.id_producto,
        id_empl: it.id_empl,
        id_empresa,
        cantidad: it.cantidad ?? 1,
        tarifa_monto: it.tarifa_monto ?? 0,
        flag: true,
      }));

    const servicios = detalle
      .filter((it) => it.clase === "servicio")
      .map((it) => ({
        id_venta: venta.id,
        id_servicio: it.id_servicio,
        id_empl: it.id_empl,
        id_empresa,
        cantidad: it.cantidad ?? 1,
        tarifa_monto: it.tarifa_monto ?? 0,
        flag: true,
      }));

    // Guardar detalles (si existen)
    if (productos.length) {
      await detalleVenta_producto.bulkCreate(productos);
    }
    if (servicios.length) {
      await detalleventa_servicios.bulkCreate(servicios);
    }

    // Respuesta
    return res.status(201).json({
      ok: true,
      msg: "success",
      venta,
      detalles: { productos: productos.length, servicios: servicios.length },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      msg: "Error al registrar comanda",
      error: error.message,
    });
  }
};
const getComandas = async (req = request, res = response) => {
  try {
    const { id_empresa } = req.params;

    const comandas = await Venta.findAll({
      where: { flag: true, id_empresa: id_empresa, status_remove: 1467 },
      attributes: [
        "id",
        "id_cli",
        "id_empl",
        "id_origen",
        "id_tipoFactura",
        "numero_transac",
        "fecha_venta",
        "status_remove",
        "observacion",
      ],
      order: [["fecha_venta", "DESC"]],
      include: [
        {
          model: Cliente,
          attributes: [
            [
              Sequelize.fn(
                "CONCAT",
                Sequelize.col("tb_cliente.nombre_cli"),
                " ",
                Sequelize.col("tb_cliente.apPaterno_cli"),
                " ",
                Sequelize.col("tb_cliente.apMaterno_cli"),
              ),
              "nombres_apellidos_cli",
            ],
          ],
        },
        {
          model: detalleVenta_producto,
          where: { flag: true },
          required: false,
          attributes: [
            "id_venta",
            "id_producto",
            "cantidad",
            "precio_unitario",
            "tarifa_monto",
          ],
          include: [
            {
              model: Producto,
              attributes: ["nombre_producto", "prec_venta", "prec_compra"],
            },
            {
              model: Empleado,
              as: "empleado_producto",
              attributes: [
                [
                  Sequelize.fn(
                    "CONCAT",
                    Sequelize.col(
                      "detalle_ventaProductos->empleado_producto.nombre_empl",
                    ),
                    " ",
                    Sequelize.col(
                      "detalle_ventaProductos->empleado_producto.apPaterno_empl",
                    ),
                    " ",
                    Sequelize.col(
                      "detalle_ventaProductos->empleado_producto.apMaterno_empl",
                    ),
                  ),
                  "nombres_apellidos_empl",
                ],
                "nombre_empl",
                "apPaterno_empl",
              ],
            },
          ],
        },
        {
          model: detalleVenta_citas,
          where: { flag: true },
          required: false,
          attributes: ["id_venta", "id_servicio", "tarifa_monto"],
        },
        {
          model: detalleVenta_pagoVenta,
          attributes: ["id_venta", "parcial_monto", "n_operacion"],
          include: [
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_banco",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_forma_pago",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_tipo_tarjeta",
            },
            {
              model: Parametros,
              attributes: ["id_param", "label_param"],
              as: "parametro_tarjeta",
            },
          ],
        },
        {
          model: detalleventa_servicios,
          as: "detalle_ventaservicios",
          include: [
            {
              model: ServiciosCircus,
              attributes: ["nombre_servicio", "precio", "duracion"],
            },
            {
              model: Empleado,
              as: "empleado_servicio",
              attributes: [
                [
                  Sequelize.fn(
                    "CONCAT",
                    Sequelize.col(
                      "detalle_ventaservicios->empleado_servicio.nombre_empl",
                    ),
                    " ",
                    Sequelize.col(
                      "detalle_ventaservicios->empleado_servicio.apPaterno_empl",
                    ),
                    " ",
                    Sequelize.col(
                      "detalle_ventaservicios->empleado_servicio.apMaterno_empl",
                    ),
                  ),
                  "nombres_apellidos_empl",
                ],
                "nombre_empl",
                "apPaterno_empl",
                "apMaterno_empl",
              ],
            },
          ],
        },
      ],
    });
    res.status(201).json({
      comandas,
      msg: "success",
    });
  } catch (error) {
    console.log(error);
  }
};
const obtenerVentasxIdCli = async (req = request, res = response) => {
  const { id_cli } = req.params;
  try {
    const ventas = await Venta.findAll({
      where: { flag: true, id_cli },
      attributes: [
        "id",
        "id_cli",
        "id_empl",
        "id_origen",
        "id_tipoFactura",
        "numero_transac",
        "fecha_venta",
        "status_remove",
        "observacion",
      ],
      order: [["fecha_venta", "DESC"]],
      include: [
        {
          model: Cliente,
          attributes: [
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
          ],
          include: [
            {
              model: ImagePT,
            },
          ],
        },
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
        {
          model: detalleVenta_Transferencia,
          as: "venta_venta",
          required: false, // Para que no excluya toda la venta si no tiene productos con flag=true
          attributes: ["id_venta", "tarifa_monto"],
        },
        {
          model: detalleVenta_producto,
          required: false, // Para que no excluya toda la venta si no tiene productos con flag=true
          attributes: [
            "id_venta",
            "id_producto",
            "cantidad",
            "precio_unitario",
            "tarifa_monto",
          ],
        },
        {
          model: detalleVenta_membresias,
          required: false, // Para que no excluya toda la venta si no tiene productos con flag=true
          attributes: [
            "id",
            "id_venta",
            "id_pgm",
            "id_tarifa",
            "horario",
            "id_st",
            "tarifa_monto",
            "fecha_inicio",
            "id_membresia_anterior",
          ],
          include: [
            {
              model: ProgramaTraining,
            },
          ],
        },
        {
          model: detalleVenta_citas,
          required: false,
          attributes: ["id_venta", "id_servicio", "tarifa_monto"],
        },
        {
          model: detalleVenta_pagoVenta,
          attributes: ["id_venta", "parcial_monto"],
          include: [
            {
              model: Parametros,
              as: "parametro_forma_pago",
            },
          ],
        },
      ],
    });
    console.log({ ventas });

    res.status(200).json({
      ok: true,
      ventas,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: `Error en el servidor, en controller de get_VENTAS, hable con el administrador: ${error}`,
    });
  }
};
module.exports = {
  obtenerVentasxIdCli,
  getComandas,
  postComanda,
  postVentaProductos,
  postVentaServicios,
  obtenerUltimasVentasxComprobantes,
  putVentaxId,
  postCajaApertura,
  obtenerMembresiasxUIDcliente,
  obtenerComparativoResumenClientes,
  obtenerTransferenciasResumenxMes,
  postCambioPrograma,
  get_VENTAS_CIRCUS,
  obtenerClientesxDistritos,
  postVenta,
  get_VENTAS,
  get_VENTA_ID,
  getPDF_CONTRATO,
  obtener_contrato_pdf,
  getVentasxFecha,
  getVencimientosPorMes,
  mailMembresia,
  postTraspasoMembresia,
  estadosClienteMembresiaVar,
  comparativaPorProgramaApi,
  obtenerVentasMembresiaxEmpresa,
  obtenerContratosClientes,
  obtenerClientesVentas,
  agregarFirmaEnContrato,
  obtenerComparativoResumen,
  obtenerComparativoResumenDashboard,
  obtenerEstadoResumen,
  obtenerVentasxTipoFactura,
  obtenerVentasDeClientesNuevos,
  obtenerTransferenciasxFecha,
  obtenerClientesConMembresia,
  obtenerComparativoResumenxMES,
  obtenerMembresias,
  obtenerMarcacionesClientexMembresias,
  obtenerComparativoTotal,
  buscarCajasxFecha,
  updateDetalleProducto,
  updateDetalleServicio,
  getVentasDashboard,
};
