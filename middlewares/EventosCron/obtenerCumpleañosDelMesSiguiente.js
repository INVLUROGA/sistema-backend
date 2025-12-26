const dayjs = require("dayjs");
const { Empleado } = require("../../models/Usuarios");
const { DateMask } = require("../../helpers/FunctionsMasks");
const { AlertasUsuario } = require("../../models/Auditoria");

const obtenerCumpleaniosDelMesSiguiente = async () => {
  // const hoy = new Date();
  // const siguienteMes = new Date(hoy);
  // siguienteMes.setMonth(hoy.getMonth() + 1);
  // mes siguiente
  // const year = hoy.getFullYear();
  // const month = hoy.getMonth() === 11 ? 11 : hoy.getMonth() + 1; // +1 = siguiente mes

  // último día del mes siguiente
  // const lastDay = new Date(year, month + 1, 0).getDate();

  // const fechas = Array.from({ length: lastDay }, (_, i) => {
  //   const day = String(i + 1).padStart(2, "0");
  //   const mm = String(month + 1).padStart(2, "0"); // month es 0-based
  //   return `${day}-${mm}`;
  // });

  // const empleados = await Empleado.findAll({
  //   where: { flag: true, estado_empl: true },
  //   raw: true,
  //   attributes: ["fecha_nacimiento"],
  // });
  // const empleadosFiltrados = empleados
  //   .map((e) => {
  //     const fechaNacimiento = DateMask(e.fecha_nacimiento, "DD-MM");
  //     const diaMes = fechaNacimiento;
  //     return { ...e, diaMes };
  //   })
  //   .filter((e) => fechas.includes(e.diaMes));
  // console.log(empleados, empleadosFiltrados, fechas, hoy.getMonth());
  // const alertas1565 = await AlertasUsuario.findAll({
  //   where: { mensaje: "1565" },
  //   raw: true,
  // });
  // const agregarAlerta = alertas1565.map((e) => {
  //   const empleadosFiltrado = empleadosFiltrados.map(em=>{
  //     return {

  //     }
  //   })
  // });
  // return AlertasUsuario.create({id_user: e.id_user, tipo_alerta: })
  // console.log({ alertasCumple });
  return true;
};

module.exports = {
  obtenerCumpleaniosDelMesSiguiente,
};
