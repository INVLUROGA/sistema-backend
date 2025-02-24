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
} = require("../models/Venta");
const { Cliente, Empleado } = require("../models/Usuarios");
const { Sequelize, Op } = require("sequelize");
const { Producto } = require("../models/Producto");
const {
  ProgramaTraining,
  SemanasTraining,
  TarifaTraining,
} = require("../models/ProgramaTraining");
const { HorarioProgramaPT } = require("../models/HorarioProgramaPT");
const { Parametros } = require("../models/Parametros");
const { v4 } = require("uuid");
const { typesCRUD } = require("../types/types");
const { capturarAUDIT } = require("../middlewares/auditoria");
const { Servicios } = require("../models/Servicios");
const fs = require("fs");
const fontkit = require("fontkit");
const path = require("path");
const { Client_Contrato } = require("../helpers/pdf/Client_Contrato");
const dayjs = require("dayjs");
const transporterU = require("../config/nodemailer");
const { mailMembresiaSTRING } = require("../middlewares/mails");
const { error } = require("console");
const { Result } = require("express-validator");
require("dotenv").config();
const env = process.env;

const { detalleVenta_transferenciasMembresias } = require("../models/Venta");
const { CLIENT_RENEG_LIMIT } = require("tls");
const { ImagePT } = require("../models/Image");
const { KeyObject } = require("crypto");
const { Distritos } = require("../models/Distritos");
const { FormatMoney } = require("../helpers/formatMoney");
const {
  mailContratoMembresia,
} = require("../middlewares/mailContratoMembresia");
const utc = require("dayjs/plugin/utc");
const { Marcacion } = require("../models/Marcacion");
const { Cita } = require("../models/Cita");
const { ExtensionMembresia } = require("../models/ExtensionMembresia");

// Cargar el plugin
dayjs.extend(utc);

const estadosClienteMembresiaVar = async (req = request, res = response) => {
  //const {tipoPrograma , fechaDesde, fechaHasta} = req.body;
  const { tipoPrograma, fechaDesde, fechaHasta } = req.body;
  try {
    const respuesta = await estadosClienteMembresiaV2(
      tipoPrograma,
      fechaDesde,
      fechaHasta
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
  fechaHastaStr
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
                Sequelize.col("apMaterno_cli")
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
                Sequelize.col("apMaterno_cli")
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
          venta.detalle_ventaMembresia[0].fec_fin_mem
        );
      }

      if (fecha_venta >= fechaDesdeStr && fecha_venta <= fechaHastaStr) {
        contadorVentasConTrue++;
      }

      if (contadorVentasConTrue == 1 && ContadorVentasGeneral == 1) {
        tipoCliente = "Cliente Nuevo";
        Primerafecha_fin_membresia = new Date(
          venta.detalle_ventaMembresia[0].fec_fin_mem
        );
      }

      if (contadorVentasConTrue == 2 || ContadorVentasGeneral == 2) {
        Segundafecha_fin_membresia = new Date(
          venta.detalle_ventaMembresia[0].fec_fin_mem
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
    fechaHastaStr
  );
  return response;
}

function ContadoresEstadoClienteInscripcion(
  AnalisisGeneral,
  fechaDesde,
  fechaHasta
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
      new Date(fechaDate.getFullYear(), nroMesActual, 1)
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
    })
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
  // let base64_contratoPDF = "";
  try {
    if (req.productos && req.productos.length > 0) {
      const ventasProductosConIdVenta = await req.productos.map((producto) => ({
        id_producto: producto.id_producto,
        cantidad: producto.cantidad,
        precio_unitario: producto.precio_unitario,
        tarifa_monto: producto.tarifa,
        id_venta: req.ventaID,
      }));
      // Crear múltiples registros en detalleVenta_producto
      await detalleVenta_producto.bulkCreate(ventasProductosConIdVenta);
    }
    if (req.ventaProgramas && req.ventaProgramas.length > 0) {
      // Crear múltiples registros en detalleVenta_producto
      // const { dataVenta, detalle_cli_modelo, datos_pagos } = req.body;

      // const pdfContrato = await getPDF_CONTRATO(
      //   dataVenta.detalle_venta_programa[0],
      //   detalle_cli_modelo,
      //   datos_pagos,
      //   req.ventaID
      // );
      // if (dataVenta.detalle_venta_programa[0].firmaCli) {
      //   await mailContratoMembresia(
      //     pdfContrato,
      //     dataVenta.detalle_venta_programa[0],
      //     detalle_cli_modelo,
      //     datos_pagos,
      //     req.ventaID
      //   );
      // }
      // base64_contratoPDF = `data:application/pdf;base64,${Buffer.from(
      //   pdfContrato
      // ).toString("base64")}`;

      const ventasMembresiasConIdVenta = await req.ventaProgramas.map(
        (mem) => ({
          id_venta: req.ventaID,
          uid_firma: uid_firma,
          uid_contrato: uid_contrato,
          ...mem,
        })
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
        })
      );
      await detalleVenta_Transferencia.bulkCreate(
        ventasTransferenciaConIdVenta
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

    const pdfContrato = await getPDF_CONTRATO(
      dataVenta,
      detalle_cli_modelo,
      dataPagos
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=CONTRATO-CLIENTE.pdf"
    );
    res.send(Buffer.from(pdfContrato));
  } catch (error) {
    console.log(error);
  }
};
const getPDF_CONTRATO = async (
  detalle_membresia,
  dataVenta,
  dataPago,
  id_venta
) => {
  const {
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
  } = detalle_membresia;
  console.log(time_h, "EL HORARIO");

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
  const dataInfo = {
    nombresCliente: data_cliente.nombre_cli,
    apPaternoCliente: data_cliente.apPaterno_cli,
    apMaternoCliente: data_cliente.apMaterno_cli,
    dni: `${data_cliente.numDoc_cli}`,
    DireccionCliente: data_cliente.direccion_cli,
    PaisCliente: "Peru",
    CargoCliente: data_cliente.cargo_cli,
    EmailCliente: data_cliente.email_cli,
    EdadCliente: `${calcularEdad(data_cliente.fecha_nacimiento)}`,
    DistritoCliente: data_Distrito.distrito,
    FechaDeNacimientoCliente: `${dayjs(data_cliente.fecha_nacimiento).format(
      "DD/MM/YYYY"
    )}`,
    CentroDeTrabajoCliente: data_cliente.trabajo_cli,
    origenCliente: `${data_origen?.label_param}`,
    sede: "Miraflores",
    nContrato: id_venta,
    codigoSocio: id_cli,
    fecha_venta: `${dayjs.utc(fecha_venta).format("DD/MM/YYYY")}`,
    hora_venta: `${dayjs.utc(fecha_venta).format("hh:mm:ss A")}`,
    //datos de membresia
    id_pgm: `${id_pgm}`,
    Programa: name_pgm,
    fec_inicio: `${dayjs.utc(fechaInicio_programa).format("DD/MM/YYYY")}`,
    fec_fin: `${dayjs(fechaFinal, "YYYY-MM-DD").format("DD/MM/YYYY")}`,
    horario: `${dayjs.utc(time_h).format("hh:mm A")}`,
    semanas: semanas,
    dias_cong: `${cong}`,
    sesiones_nutricion: `${nutric}`,
    asesor: `${data_empl.nombre_empl.split(" ")[0]}`,
    forma_pago: dataPago?.map((item) => {
      if (item.id_forma_pago === 597) {
        return `${item.label_tipo_tarjeta?.split(" ")[1]} ${item.label_banco}`;
      } else {
        return item.label_forma_pago;
      }
    }),
    monto: `${FormatMoney(tarifa, "S/. ")}`,
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
        "id_tipoFactura",
        "numero_transac",
        "fecha_venta",
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
                Sequelize.col("apMaterno_cli")
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
                Sequelize.col("apMaterno_empl")
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
        {
          model: detalleVenta_citas,
          attributes: ["id_venta", "id_servicio", "tarifa_monto"],
        },
        {
          model: detalleVenta_pagoVenta,
          attributes: ["id_venta", "parcial_monto"],
        },
      ],
    });
    res.status(200).json({
      ok: true,
      ventas,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de get_VENTAS, hable con el administrador: ${error}`,
    });
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
                Sequelize.col("apMaterno_cli")
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
                Sequelize.col("apMaterno_empl")
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
  try {
    const ventas = await Venta.findAll({
      attributes: [
        "id",
        "id_cli",
        "id_empl",
        "id_tipoFactura",
        "numero_transac",
        "flag",
        "fecha_venta",
      ],
      where: {
        fecha_venta: {
          [Op.between]: [arrayDate[0], arrayDate[1]],
        },
        flag: true,
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
                Sequelize.col("apMaterno_cli")
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
                Sequelize.col("apMaterno_empl")
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
              attributes: ["id", "id_categoria"],
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
      ],
    });
    res.status(200).json({
      ok: true,
      ventas,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de get_VENTAS, hable con el administrador: ${error}`,
    });
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
      detalle_membresia,
      detalleVenta,
      dataPago,
      id_venta
    );

    const base64_contratoPDF = `data:application/pdf;base64,${Buffer.from(
      pdfContrato
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
      text: "Contenido del mensaje", // Cuerpo del correo en texto plano
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
        `${dataEmpleado.nombre_empl} ${dataEmpleado.apPaterno_empl}`
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
const get_VENTAS_detalle_PROGRAMA = async (req = request, res = response) => {};
const get_VENTAS_detalle_PRODUCTO = async (req = request, res = response) => {};
const get_VENTAS_detalle_CITAS = async (req = request, res = response) => {};

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
  res = response
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
                Sequelize.col("apMaterno_cli")
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
                Sequelize.col("apMaterno_empl")
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
                Sequelize.col("apMaterno_cli")
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
                Sequelize.col("apMaterno_empl")
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
                  attributes: [
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
    const ventasTransferencias = await Venta.findAll({
      order: [["fecha_venta", "DESC"]],
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
          where: { id_empresa: 598 },
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
                    Sequelize.col("apMaterno_cli")
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

const obtenerComparativoResumenClientes = async (
  req = request,
  res = response
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
          where: { id_empresa: 598 },
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
                    Sequelize.col("apMaterno_cli")
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

  const fechaInicio = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)); // Primer día del mes
  const fechaFin = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)); // Último día del mes
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
            Sequelize.col("apMaterno_cli")
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
  res = response
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
                Sequelize.col("apMaterno_cli")
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
  res = response
) => {
  try {
    const year = 2024;
    const month = 9; // Octubre (número del mes en formato 1-12)
    const { id_enterprice } = req.params;
    const membresias = await Venta.findAll({
      order: [["fecha_venta", "DESC"]],
      where: {
        id_empresa: id_enterprice,
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
                Sequelize.col("apMaterno_cli")
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

function bytesToBase64(bytes) {
  // Convertir bytes a cadena binaria
  let binaryString = "";
  bytes.forEach((byte) => {
    binaryString += String.fromCharCode(byte);
  });

  // Convertir la cadena binaria en Base64
  return btoa(binaryString);
}
module.exports = {
  obtenerMembresiasxUIDcliente,
  obtenerComparativoResumenClientes,
  obtenerTransferenciasResumenxMes,
  postCambioPrograma,
  obtenerClientesxDistritos,
  postVenta,
  get_VENTAS,
  get_VENTA_ID,
  get_VENTAS_detalle_PROGRAMA,
  get_VENTAS_detalle_PRODUCTO,
  get_VENTAS_detalle_CITAS,
  getPDF_CONTRATO,
  obtener_contrato_pdf,
  getVentasxFecha,
  mailMembresia,
  postTraspasoMembresia,
  estadosClienteMembresiaVar,
  comparativaPorProgramaApi,
  obtenerVentasMembresiaxEmpresa,
  obtenerContratosClientes,
  obtenerClientesVentas,
  agregarFirmaEnContrato,
  obtenerComparativoResumen,
  obtenerEstadoResumen,
  obtenerVentasxTipoFactura,
  obtenerVentasDeClientesNuevos,
  obtenerTransferenciasxFecha,
  obtenerClientesConMembresia,
  obtenerComparativoResumenxMES,
  obtenerMembresias,
  obtenerMarcacionesClientexMembresias,
};
