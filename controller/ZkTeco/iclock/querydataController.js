// Controlador para /iclock/querydata
// Respuesta del equipo (PUSH acc) al comando "DATA QUERY": envía los datos por paquetes.
const accUserService = require("../../../services/accUserService");
const accHuellaService = require("../../../services/accHuellaService");

exports.fxpost = async (req, res) => {
  const serial = req.query.SN;
  const tablename = req.query.tablename || "";
  try {
    console.log(
      `-POST querydata- SN: ${serial} | tabla: ${tablename} | paquete ${req.query.packidx || 1}/${req.query.packcnt || 1}`
    );

    let cantidad = parseInt(req.query.count, 10) || 0;
    if (tablename === "user") {
      const usuarios = accUserService.segmentarTramaUsuarios(req.body);
      const guardados = await accUserService.guardarUsuarios(usuarios);
      console.log(`[zk-usuarios] ${guardados} usuarios guardados desde ${serial}`);
      cantidad = usuarios.length;
    } else if (accHuellaService.TABLAS_HUELLAS.includes(tablename)) {
      const huellas = accHuellaService.segmentarTramaHuellas(req.body);
      const r = await accHuellaService.guardarHuellas(huellas);
      console.log(
        `[zk-huellas] ${serial}: ${r.nuevas} nuevas, ${r.actualizadas} actualizadas, ${r.sinCambios} sin cambios`
      );
      // Se confirma todo lo recibido (incluye rostros u otros tipos que no se guardan)
      cantidad = accHuellaService.contarRegistros(req.body);
    }

    // El equipo espera "<tabla>=<cantidad recibida>"
    res.type("text/plain").send(`${tablename}=${cantidad}`);
  } catch (err) {
    console.error("Error en /iclock/querydata", err);
    res.status(500).send("Error en el servidor");
  }
};
