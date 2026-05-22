const { enviarMensajesWsp } = require("../../config/whatssap-web");
const { enviarWspUsuario } = require("../../helpers/enviarWspUsuario");
const { Empleado } = require("../../models/Usuarios");

const fechaHoy = new Date();
const fechaHoyMas1 = new Date();
fechaHoyMas1.setDate(fechaHoy.getDate() + 1);
const fechaHoyMas2 = new Date();
fechaHoyMas2.setDate(fechaHoy.getDate() + 2);

const obtenerCumpleaniosEmpleadosxDia = async () => {
  const cumpleaniosHoy = await cumpleaniosxDiaMes(
    fechaHoy.getDate(),
    fechaHoy.getMonth() + 1,
  );
  const cumpleaniosHoyMas1 = await cumpleaniosxDiaMes(
    fechaHoyMas1.getDate(),
    fechaHoyMas1.getMonth() + 1,
  );
  const cumpleaniosHoyMas2 = await cumpleaniosxDiaMes(
    fechaHoyMas2.getDate(),
    fechaHoyMas2.getMonth() + 1,
  );
  const cumpleaniosAprox = [
    ...cumpleaniosHoy,
    ...cumpleaniosHoyMas1,
    ...cumpleaniosHoyMas2,
  ]
    .map((m) => {
      return `${m.nombre_empl} ${m.apPaterno_empl} CUMPLE AÑOS EL DIA ${m.fechaP.diaP}-${m.fechaP.mesP}
      `;
    })
    .join(", ");
  const idsUsers = [30, 31, 10];
  await enviarWspUsuario(
    cumpleaniosAprox,
    new Date().setMinutes(new Date().getMinutes() + 1),
    idsUsers,
  );
};
const cumpleaniosxDiaMes = async (dia, mes) => {
  const empleados = await Empleado.findAll({
    where: { flag: true, id_empresa: 598, estado_empl: true },
  });
  const empleadosMAP = empleados
    .map((a) => a.toJSON())
    .map((m) => {
      const fechaP = new Date(m.fecha_nacimiento);
      const mesP = fechaP.getMonth() + 1;
      const anioP = fechaP.getFullYear();
      const diaP = fechaP.getDate();
      return {
        nombre_empl: m.nombre_empl,
        apPaterno_empl: m.apPaterno_empl,
        apMaterno_empl: m.apMaterno_empl,
        fecha_nacimiento: m.fecha_nacimiento,
        telefono_empl: m.telefono_empl,
        fechaP: {
          mesP,
          anioP,
          diaP,
        },
      };
    })
    .filter((f) => f.fechaP.mesP === mes && f.fechaP.diaP === dia);
  return empleadosMAP;
};

module.exports = {
  obtenerCumpleaniosEmpleadosxDia,
};
