const { request, response } = require("express");
const { Parametros, Parametros_3 } = require("../models/Parametros");
const { Sequelize, where } = require("sequelize");
const { ParametroGastos, ParametroGrupo } = require("../models/GastosFyV");
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

const terminologiasGastosxEmpresa = async (req = request, res = response) => {
  const { id_empresa } = req.params;
  try {
    console.log({ id_empresa });

    const termGastos = await ParametroGastos.findAll({
      where: {
        flag: true,
        id_empresa: id_empresa,
      },
      order: [["id", "desc"]],
      include: [
        {
          model: ParametroGrupo,
          as: "parametro_grupo",
        },
      ],
    });
    res.status(201).json({
      termGastos,
    });
  } catch (error) {
    console.log(error);
  }
};
const postterminologiasGastosxEmpresa = async (
  req = request,
  res = response
) => {
  try {
    const termGastos = new ParametroGastos(req.body);
    termGastos.save();
    res.status(201).json({
      termGastos,
    });
  } catch (error) {
    console.log(error);
  }
};
const putterminologiasGastosxEmpresa = async (
  req = request,
  res = response
) => {
  const { id_empresa } = req.params;
  try {
    const termGastos = await ParametroGastos.findAll({
      where: {
        flag: true,
        id_empresa: id_empresa,
      },
    });
    res.status(201).json({
      termGastos,
    });
  } catch (error) {
    console.log(error);
  }
};
const deleteterminologiasGastosxEmpresa = async (
  req = request,
  res = response
) => {
  const { id } = req.params;
  try {
    const termGastos = await ParametroGastos.findOne({ where: { id: id } });
    termGastos.res.status(201).json({
      termGastos,
    });
  } catch (error) {
    console.log(error);
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
  terminologiasGastosxEmpresa,
  postterminologiasGastosxEmpresa,
  putterminologiasGastosxEmpresa,
  deleteterminologiasGastosxEmpresa,
};
