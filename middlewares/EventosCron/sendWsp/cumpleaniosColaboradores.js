const { Empleado } = require("../../../models/Usuarios");
const { enviarWspUsuario } = require("../../../helpers/enviarWspUsuario");

const ID_EMPRESA = 598;
const IDS_USERS_AVISO = [35, 31, 30];

// Fecha de hoy en hora de Perú, sin importar la zona horaria del servidor
const hoyEnLima = () => {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // "YYYY-MM-DD"
  const [anio, mes, dia] = partes.split("-").map(Number);
  return { anio, mes, dia };
};

const esBisiesto = (anio) =>
  (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;

const cumpleaniosColaboradores = async () => {
  try {
    const { anio, mes, dia } = hoyEnLima();

    const empleados = await Empleado.findAll({
      where: { flag: true, id_empresa: ID_EMPRESA, estado_empl: true },
      raw: true,
    });

    const cumpleanieros = empleados.filter((e) => {
      if (!e.fecha_nacimiento) return false;
      const fechaNac = new Date(e.fecha_nacimiento);
      if (isNaN(fechaNac)) return false;
      // La BD guarda en UTC (timezone "+00:00"): se lee la fecha en UTC
      // para que no se corra un día al restar las 5 horas de Perú
      const diaNac = fechaNac.getUTCDate();
      const mesNac = fechaNac.getUTCMonth() + 1;
      // Los nacidos el 29 de febrero se saludan el 28 en años no bisiestos
      if (mesNac === 2 && diaNac === 29 && !esBisiesto(anio)) {
        return mes === 2 && dia === 28;
      }
      return diaNac === dia && mesNac === mes;
    });

    for (const e of cumpleanieros) {
      const nombres_apellidos = [e.nombre_empl, e.apPaterno_empl, e.apMaterno_empl]
        .filter(Boolean)
        .join(" ");
      const n_anios_cumplidos =
        anio - new Date(e.fecha_nacimiento).getUTCFullYear();
      const mensaje = `🎂 HOY ES EL CUMPLEAÑOS DE ${nombres_apellidos} (${n_anios_cumplidos} años)`;
      await enviarWspUsuario(
        mensaje,
        new Date().setMinutes(new Date().getMinutes() + 1),
        IDS_USERS_AVISO,
      );
      console.log(`[cumpleaniosColaboradores] ${mensaje}`);
    }
  } catch (error) {
    console.log("Error en cumpleaniosColaboradores", error);
  }
};

module.exports = {
  cumpleaniosColaboradores,
};
