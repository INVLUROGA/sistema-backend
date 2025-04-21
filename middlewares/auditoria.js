const { Auditoria, AuditoriaNew } = require("../models/Auditoria");

const capturarAUDIT = async (formAuditoria) => {
  try {
    const { id_user, ip_user, accion, observacion } = formAuditoria;
    // Verifica los datos recibidos en formAuditoria
    const fecha_audit = new Date();
    // Crea una nueva instancia de Auditoria con los datos proporcionados
    const auditoria = new Auditoria({
      id_user,
      ip_user,
      accion,
      observacion,
      fecha_audit,
    });

    // Guarda la auditoría en la base de datos
    await auditoria.save();
  } catch (error) {
    console.log("Hay error aquii", error);
  }
};
const capturarAccion = async (formAuditoria) => {
  try {
    const { id_user, ip_user, accion, observacion, arrayNuevo, arrayViejo } =
      formAuditoria;
    // Verifica los datos recibidos en formAuditoria
    const fecha_audit = new Date();
    // Crea una nueva instancia de Auditoria con los datos proporcionados
    const auditoria = new AuditoriaNew({
      id_user,
      ip_user,
      accion,
      observacion,
      fecha_audit,
      arrayViejo: JSON.stringify(arrayViejo),
      arrayNuevo: JSON.stringify(arrayNuevo),
    });

    // Guarda la auditoría en la base de datos
    await auditoria.save();
  } catch (error) {
    console.log("Hay error aquii", error);
  }
};
module.exports = {
  capturarAUDIT,
  capturarAccion,
};
