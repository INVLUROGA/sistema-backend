const { response, request } = require("express");
const { Empleado } = require("../models/Usuarios");
const { Sequelize } = require("sequelize");
const { Distritos } = require("../models/Distritos");
const { ImagePT } = require("../models/Image");

const obtenerEmpleadosxDepartamento = async (req = request, res = response) => {
  try {
    const { departamento_empl, id_empresa } = req.params;
    const empleados = await Empleado.findAll({
      where: { departamento_empl, id_empresa, flag: true, estado_empl: true },
    });
    res.status(201).json({
      ok: true,
      empleados,
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      ok: false,
    });
  }
};
const postEmpleado = async (req = request, res = response) => {
  try {
    const { formState } = req.body;
    const empleado = await Empleado.create(formState);
    res.status(201).json({
      empleado,
    });
  } catch (error) {
    console.log(error);
  }
};
const updateEmpleadoxID = async (req = request, res = response) => {
  try {
    const { formState } = req.body;
    const { id } = req.params;
    const empleado = await Empleado.findOne({ where: { id_empl: id } });
    await empleado.update(formState);
    res.status(201).json({
      empleado,
      msg: "cambiado con exito",
    });
  } catch (error) {
    console.log(error);
  }
};
const deleteEmpleadoxID = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const empleado = await Empleado.findOne({ where: { id_empl: id } });
    await empleado.update({ flag: false });
    res.status(201).json({
      empleado,
      msg: "eliminado con exito",
    });
  } catch (error) {
    console.log(error);
  }
};
const obtenerEmpleadosxEstadoxEmpresa = async (
  req = request,
  res = response,
) => {
  try {
    const { id_empresa, id_estado } = req.params;
    const empleados = await Empleado.findAll({
      attributes: [
        "uid",
        "id_empl",
        "fecNac_empl",
        "fecha_nacimiento",
        "cargo_empl",
        "nombre_empl",
        "apPaterno_empl",
        "apMaterno_empl",
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
        ["ubigeo_distrito_empl", "ubigeo_distrito"],
        "email_empl",
        "telefono_empl",
        "email_corporativo",
        "uid_contactsEmergencia",
        "id_empresa",
        ["estado_empl", "estado"],
      ],
      where: { id_empresa, estado_empl: id_estado, flag: true },
      include: [
        {
          model: Distritos,
        },
        {
          model: ImagePT,
        },
      ],
      order: [["id_empl", "desc"]],
    });
    res.status(201).json({
      msg: true,
      empleados,
    });
  } catch (error) {
    console.log(error);
  }
};
const obtenerEmpleadoxID = async () => {
  try {
    const { id } = req.params;
    const empleado = await Empleado.findOne({ where: { id_empl: id } });
    res.status(201).json({
      empleado,
    });
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  obtenerEmpleadosxDepartamento,
  postEmpleado,
  deleteEmpleadoxID,
  updateEmpleadoxID,
  obtenerEmpleadosxEstadoxEmpresa,
  obtenerEmpleadoxID,
};
