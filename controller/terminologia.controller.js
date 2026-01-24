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
          parametoFiltrado.entidad_param == parametro.entidad_param,
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
        (parametoFiltrado) => parametoFiltrado.empresa == parametro.id_empresa,
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
  const { id_empresa, id_tipo } = req.params;
  try {
    const termGastos = await ParametroGastos.findAll({
      where: {
        flag: true,
        id_empresa: id_empresa,
        tipo: id_tipo,
      },
      order: [["id", "desc"]],
      include: [
        {
          model: ParametroGrupo,
          as: "parametro_grupo",
        },
      ],
    });
    console.log({ id_tipo, termGastos });

    res.status(201).json({
      termGastos,
    });
  } catch (error) {
    console.log(error);
  }
};
const postterminologiasGastosxEmpresa = async (
  req = request,
  res = response,
) => {
  try {
    const termGastos = new ParametroGastos({
      ...req.body,
      tipo: 1573,
    });
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
  res = response,
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
  res = response,
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
// * TODO: RUTAS DE TERMINOLOGIAS
const obtenerTerminologia2xEmpresaxTipo = async (
  req = request,
  res = response,
) => {
  try {
    const { id_empresa, tipo } = req.params;
    const terminologia2 = await ParametroGastos.findAll({
      where: { id_empresa, tipo, flag: true },
    });
    res.status(201).json({
      terminologia2,
    });
  } catch (error) {
    console.log(error);
  }
};
const postTerminologia2 = async (req = request, res = response) => {
  try {
    const { id_empresa, tipo } = req.params;
    const { formState } = req.body;
    const terminologia2 = await ParametroGastos.create({
      ...formState,
      id_empresa,
      tipo,
    });
    res.status(201).json({
      terminologia2,
    });
  } catch (error) {
    console.log(error);
  }
};
const updateTerminologia2xID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const { formState } = req.body;
    const terminologia2 = await ParametroGastos.findAll({ where: { id } });
    await ParametroGastos.update(formState);
    res.status(201).json({
      terminologia2,
    });
  } catch (error) {
    console.log(error);
  }
};
const deleteTerminologia2xID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const terminologia2 = await ParametroGastos.findAll({ where: { id } });
    await ParametroGastos.update({ flag: false });
    res.status(201).json({
      terminologia2,
    });
  } catch (error) {
    console.log(error);
  }
};

// * TERMINOLOGIAS 1
const obtenerTerminologia1 = async (req = request, res = response) => {
  try {
    const terminologia = await Parametros.findAll({
      where: { flag: true },
    });
    res.status(201).json({
      terminologia,
    });
  } catch (error) {
    console.log(error);
  }
};
const postTerminologia1 = async (req = request, res = response) => {
  try {
    const { formState } = req.body;
    const terminologia = await Parametros.create({
      ...formState,
    });
    res.status(201).json({
      terminologia,
    });
  } catch (error) {
    console.log(error);
  }
};
const updateTerminologia1xID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const { formState } = req.body;
    const terminologia = await Parametros.findAll({ where: { id } });
    await Parametros.update(formState);
    res.status(201).json({
      terminologia,
    });
  } catch (error) {
    console.log(error);
  }
};
const deleteTerminologia1xID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const terminologia = await Parametros.findAll({ where: { id } });
    await Parametros.update({ flag: false });
    res.status(201).json({
      terminologia,
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
  // TERM2
  obtenerTerminologia2xEmpresaxTipo,
  postTerminologia2,
  updateTerminologia2xID,
  deleteTerminologia2xID,
  // TERM1
  obtenerTerminologia1,
  postTerminologia1,
  updateTerminologia1xID,
  deleteTerminologia1xID,
};
