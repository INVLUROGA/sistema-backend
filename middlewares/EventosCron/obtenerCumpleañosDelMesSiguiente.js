const dayjs = require("dayjs");
const { Empleado } = require("../../models/Usuarios");
const { DateMask } = require("../../helpers/FunctionsMasks");
const { AlertasUsuario } = require("../../models/Auditoria");
const { Sequelize } = require("sequelize");

const obtenerCumpleaniosDelMesSiguiente = async () => {
  const hoy = new Date();
  const siguienteMes = new Date(hoy);
  siguienteMes.setMonth(hoy.getMonth() + 1);
  const year = hoy.getFullYear();
  const month = hoy.getMonth(); // +1 = siguiente mes

  // último día del mes siguiente
  const lastDay = new Date(year, month + 1, 0).getDate();

  const fechas = Array.from({ length: lastDay }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    const mm = String(month + 1).padStart(2, "0"); // month es 0-based
    return `${day}-${mm}`;
  });

  const empleados = await Empleado.findAll({
    where: { flag: true, estado_empl: true },
    raw: true,
    attributes: [
      "fecha_nacimiento",
      [
        Sequelize.literal("CONCAT(nombre_empl, ' ', apPaterno_empl)"),
        "nombre_apellidos_empl",
      ],
    ],
  });
  const empleadosFiltrados = empleados
    .map((e) => {
      const fechaNacimiento = DateMask(e.fecha_nacimiento, "DD-MM");
      const diaMes = fechaNacimiento;
      return { ...e, diaMes };
    })
    .filter((e) => fechas.includes(e.diaMes));
  const alertas1565 = await AlertasUsuario.findAll({
    where: { mensaje: "1565" },
    raw: true,
  });
  const agregarAlerta = alertas1565.map((e) => {
    const empleadosFiltrado = generarDiasAntes(empleadosFiltrados, 3).map(
      (em) => {
        return {
          id_user: e.id_user,
          mensaje: `EN ${em?.i} DIAS ES EL CUMPLEAÑOS DE --- ${em?.nombre_apellidos_empl} ${em?.diaMes}`,
          tipo_alerta: 1566,
          id_estado: 1,
          flag: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    );
    return empleadosFiltrado;
  });

  console.log(
    {
      empleados,
      empleadosFiltrados: generarDiasAntes(empleadosFiltrados, 3),
      alertas1565,
      fechas,
      agregarAlerta: JSON.stringify(agregarAlerta.flat(), null, 2),
    },
    hoy.getMonth()
  );
  return true;
};

module.exports = {
  obtenerCumpleaniosDelMesSiguiente,
};

const generarDiasAntes = (empleados, diasAntes = 3) =>
  empleados.flatMap((e) => {
    // Crear fecha en UTC-5 sin corrimiento
    const base = new Date(
      new Date(e.fecha_nacimiento).getTime() - 5 * 60 * 60 * 1000
    );

    return Array.from({ length: diasAntes + 1 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() - i);

      return {
        i,
        fecha_nacimiento: new Date(
          d.getTime() + 5 * 60 * 60 * 1000
        ).toISOString(), // mantiene -05 correcto
        nombre_apellidos_empl: e.nombre_apellidos_empl,
        diaMes:
          String(d.getDate()).padStart(2, "0") +
          "-" +
          String(d.getMonth() + 1).padStart(2, "0"),
      };
    });
  });
