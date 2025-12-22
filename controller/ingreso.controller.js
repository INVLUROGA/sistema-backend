const { request, response } = require("express");
const { Ingreso } = require("../models/Ingresos");
const { Empleado } = require("../models/Usuarios");
const { Sequelize, Op } = require("sequelize");
const { capturarAUDIT } = require("../middlewares/auditoria");
const { typesCRUD } = require("../types/types");
const { Parametros } = require("../models/Parametros");
const { ParametroGastos } = require("../models/GastosFyV");

const postIngreso = async (req = request, res = response) => {
  try {
    const ingreso = Ingreso.create(req.body);
    let formAUDIT = {
      id_user: req.id_user,
      ip_user: req.ip_user,
      accion: typesCRUD.POST,
      observacion: `Se registro: El ingreso de id ${ingreso.id}`,
    };
    await capturarAUDIT(formAUDIT);
    res.status(200).json({ msg: "Success", ingreso });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de postIngreso, hable con el administrador: ${error}`,
    });
  }
};
const getIngresos = async (req = request, res = response) => {
  const { id_empresa } = req.params;
  try {
    const ingresos = await Ingreso.findAll({
      where: {
        flag: true,
        id_empresa: id_empresa,
      },
      include: [
        {
          model: Parametros,
          as: "tarjeta",
        },
        {
          model: Parametros,
          as: "banco",
        },
        {
          model: Parametros,
          as: "concepto",
        },
      ],
    });
    res.status(200).json({ msg: "Success", ingresos });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de getIngresos, hable con el administrador: ${error}`,
    });
  }
};
const getIngresoPorID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(404).json({
        ok: false,
        msg: "No hay id",
      });
    }
    const ingreso = await Ingreso.findOne({
      where: { flag: true, id: id },
    });
    if (!ingreso) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un Ingreso con el id "${id}"`,
      });
    }
    res.status(200).json({
      ingreso,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de getIngresoPorID, hable con el administrador: ${error}`,
    });
  }
};
const getIngresosxFechaxEmpresa = async (req = request, res = response) => {
  const { arrayDate } = req.query;
  const { id_empresa } = req.params;
  const fechaInicio = arrayDate[0];
  const fechaFin = arrayDate[1];
  try {
    const ingresos = await Ingreso.findAll({
      where: {
        flag: true,
        id_empresa: id_empresa,
        fec_comprobante: {
          [Op.between]: [fechaInicio, fechaFin],
        },
      },
      include: [
        {
          model: ParametroGastos,
          attributes: ["id_empresa", "nombre_gasto", "grupo", "id_tipoGasto"],
          where: {
            id_empresa: id_empresa,
          },
        },
      ],
    });
    res.status(200).json({ msg: "Success", ingresos });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de get ingresos, hable con el administrador: ${error}`,
    });
  }
};
const deleteIngresoxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(404).json({
        ok: false,
        msg: "No hay id",
      });
    }
    const ingreso = await Ingreso.findByPk(id);
    if (!ingreso) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un Ingreso con el id "${id}"`,
      });
    }
    await ingreso.update({ flag: false });
    let formAUDIT = {
      id_user: req.id_user,
      ip_user: req.ip_user,
      accion: typesCRUD.DELETE,
      observacion: `Se elimino: El ingreso de id ${ingreso.id}`,
    };
    await capturarAUDIT(formAUDIT);
    res.status(200).json({
      msg: "Ingreso eliminado correctamente",
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller, hable con el administrador: ${error}`,
    });
  }
};
const putIngresoxID = async (req = request, res = response) => {
  try {
    let formAUDIT = {
      id_user: req.id_user,
      ip_user: req.ip_user,
      accion: typesCRUD.PUT,
      observacion: `Se actualizo: El ingreso de id 22`,
    };
    await capturarAUDIT(formAUDIT);
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller, hable con el administrador: ${error}`,
    });
  }
};
module.exports = {
  postIngreso,
  getIngresos,
  getIngresoPorID,
  putIngresoxID,
  deleteIngresoxID,
  getIngresosxFechaxEmpresa,
};
