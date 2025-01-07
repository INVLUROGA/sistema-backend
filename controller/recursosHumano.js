const { response, request } = require("express");
const { Gastos, ParametroGastos } = require("../models/GastosFyV");
const { Op } = require("sequelize");
const { Proveedor } = require("../models/Proveedor");
const { Empleado, Cliente, Usuario } = require("../models/Usuarios");
const { Parametros } = require("../models/Parametros");
const { detalleVenta_membresias } = require("../models/Venta");
const { jornadaPlanilla } = require("../models/Jornada");
const { Marcacion } = require("../models/Marcacion");

const GastoPorCargo = async (req = response, res = response) => {
  const { fechaDesdeStr, fechaHastaStr } = req.query;

  //console.log(fechaDesdeStr + " " + fechaHastaStr);
  let fechaDesde = new Date(fechaDesdeStr);
  let fechaHasta = new Date(fechaHastaStr);

  let responsePorEmpleado = {};
  let response = {};
  try {
    let gastos = await Gastos.findAll({
      where: {
        fec_registro: {
          [Op.between]: [fechaDesde, fechaHasta],
        },
        id_gasto: 659,
      },
    });

    await Promise.all(
      gastos.map(async (gasto) => {
        let proveedor = await Proveedor.findOne({
          where: {
            id: gasto.id_prov,
          },
        });
        let empleado;
        //response.push(proveedor);
        //console.log(proveedor.toJSON());
        if (proveedor.dni_vend_prov) {
          empleado = await Empleado.findOne({
            where: {
              numDoc_Empl: proveedor.dni_vend_prov,
            },
          });

          if (empleado) {
            let parametro = await Parametros.findOne({
              where: {
                grupo_param: "tipo_oficio",
                id_param: empleado.departamento_empl,
              },
            });

            if (parametro) {
              // console.log(empleado.toJSON());
              //console.log(parametro.toJSON());
              if (!responsePorEmpleado[empleado.numDoc_empl]) {
                responsePorEmpleado[empleado.numDoc_empl] = {
                  Departamento: parametro.label_param,
                  TotalSalario: empleado.salario_empl,
                };
                // response[empleado.departamento_empl].TotalSalario = 0;
              }
              if (responsePorEmpleado[empleado.numDoc_empl]) {
                responsePorEmpleado[empleado.numDoc_empl].TotalSalario +=
                  empleado.salario_empl;
              }

              if (!response[parametro.label_param]) {
                response[parametro.label_param] = {
                  /*Departamento : parametro.label_param ,*/ TotalSalario:
                    empleado.salario_empl,
                };
                // response[empleado.departamento_empl].TotalSalario = 0;
              }
              if (response[parametro.label_param]) {
                response[parametro.label_param].TotalSalario +=
                  empleado.salario_empl;
              }
            }
          }
        }
      })
    );

    // let ParametroGastos = await ParametroGastos.findOne({
    //     where:{
    //         id:659
    //     }
    // });
    // console.log(response);
    res.status(200).json({
      ok: true,
      response: response,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: true,
      response: error,
    });
  }
};

const ClienteAuth = async (req = request, res = response) => {
  try {
    //let Usuarios = await Usuario.findAll({});

    let datalleMembresias = await detalleVenta_membresias.findAll({});

    res.status(200).json({
      //usuarios: Usuarios,
      datalleMembresia: datalleMembresias,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
const postPlanillaxEmpl = async (req = request, res = response) => {
  try {
    const { uid_empleado } = req.params;
    // const {id_enter}
    console.log(req.body);

    const planilla = new jornadaPlanilla({
      ...req.body.formState,
      id_enterprice: req.body.id_enterprice,
      uid_empleado,
    });
    await planilla.save();
    res.status(200).json(planilla);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
const obtenerPlanillasxEmpl = async (req = request, res = response) => {
  try {
    const { uid_empl } = req.params;
    console.log(uid_empl);

    // const empleado = await Empleado.findOne({where: {}})
    const planillas = await jornadaPlanilla.findAll({
      where: { uid_empleado: uid_empl },
    });
    res.status(200).json(planillas);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
const obtenerAsistenciasxEmpl = async (req = request, res = response) => {
  try {
    const { uid_empleado, id_planilla } = req.params;
    const empleado = await Empleado.findOne({
      where: { uid: uid_empleado },
    });
    const planilla = await jornadaPlanilla.findOne({
      where: { id: id_planilla },
    });

    const marcaciones = await Marcacion.findAll({
      where: {
        dni: empleado.numDoc_empl,
        tiempo_marcacion_new: {
          [Op.between]: [
            new Date(planilla.fecha_desde).setUTCHours(0, 0, 0, 0),
            new Date(planilla.fecha_hasta).setUTCHours(23, 59, 59, 999),
          ],
        },
      },
    });
    console.log(planilla.fecha_desde, planilla.fecha_hasta);
    res.status(200).json(marcaciones);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: error.message,
    });
  }
};
const obtenerPlanillaxID = async (req = request, res = response) => {
  try {
    const { id_planilla } = req.params;
    const planilla = await jornadaPlanilla.findOne({
      where: { id: id_planilla },
    });
    res.status(200).json(planilla);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
module.exports = {
  GastoPorCargo,
  ClienteAuth,
  postPlanillaxEmpl,
  obtenerPlanillasxEmpl,
  obtenerAsistenciasxEmpl,
  obtenerPlanillaxID,
};
