const { request, response } = require("express");
const { Parametros, Parametros_3 } = require("../models/Parametros");
const { Sequelize, where } = require("sequelize");
const { ParametroGastos } = require("../models/GastosFyV");
const { Venta, detalleVenta_membresias } = require("../models/Venta");

const terminologiasPorEntidad = async (req = request, res = response) => {
  try {
    let response = {
      parametros: [],
      parametrosGasto: [],
    };
    let parametros = await Parametros.findAll({
      where: {
        flag: true,
      },
    });

    let parametrosGasto = await ParametroGastos.findAll({
      where: {
        flag: true,
      },
    });
    parametros.map((parametro) => {
      let parametroPorEntidad = {
        entidad_param: "",
        parametros: [],
      };

      parametroPorEntidad.entidad_param = parametro.entidad_param;
      parametroPorEntidad.parametros.push(parametro);

      let parametrosPorEntidadFiltrado = response.parametros.filter(
        (parametoFiltrado) =>
          parametoFiltrado.entidad_param == parametro.entidad_param
      );
      if (parametrosPorEntidadFiltrado.length == 0) {
        response.parametros.push(parametroPorEntidad);
      }
      if (parametrosPorEntidadFiltrado.length > 0) {
        parametrosPorEntidadFiltrado[0].parametros.push(parametro);
      }
    });

    parametrosGasto.map((parametro) => {
      let parametroPorEmpresa = {
        empresa: "",
        parametros: [],
      };
      parametroPorEmpresa.empresa = parametro.id_empresa;
      parametroPorEmpresa.parametros.push(parametro);

      const parametroGasto = response.parametrosGasto.filter(
        (parametoFiltrado) => parametoFiltrado.empresa == parametro.id_empresa
      );
      if (parametroGasto.length == 0) {
        response.parametrosGasto.push(parametroPorEmpresa);
      }
      if (parametroGasto.length > 0) {
        parametroGasto[0].parametros.push(parametro);
      }
    });

    res.status(200).json({
      ok: true,
      response: response,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      response: error.message,
    });
  }
};
const comboMesActivoVentas = async (req = request, res = response) => {
  try {
    const comboMesesActivos = await Venta.findAll({
      attributes: ["fecha_venta"],
      include: [
        {
          model: detalleVenta_membresias,
          attributes: ["id", "id_venta"],
          required: true,
        },
      ],
    });
    res.status(200).json({
      ok: true,
      res: comboMesesActivos,
    });
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  terminologiasPorEntidad,
  comboMesActivoVentas,
};
