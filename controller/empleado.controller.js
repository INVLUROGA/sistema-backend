const { response, request } = require("express");
const { Empleado } = require("../models/Usuarios");

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
module.exports = {
  obtenerEmpleadosxDepartamento,
};
