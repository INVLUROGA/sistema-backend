// Ruta /iclock/devicecmd
// El equipo informa aquí el resultado de cada comando: ID=<id>&Return=<código>&CMD=<tipo>
// Return=0 (o la cantidad de registros en DATA QUERY) es éxito; un número negativo es error.
// El resultado se guarda en dbo.zk_CommandLog para mostrar en la página si el cambio se aplicó.
const commandService = require("../../../services/commandService");

exports.fxpost = async (req, res) => {
  const serial = req.query.SN;
  const cuerpo = typeof req.body === "string" ? req.body : "";
  for (const linea of cuerpo.split("\n").filter((l) => l.trim() !== "")) {
    const resultado = new URLSearchParams(linea.trim());
    const codigo = parseInt(resultado.get("Return"), 10);
    const mensaje = `[iclock/devicecmd] SN: ${serial} | comando ${resultado.get("ID")} (${resultado.get("CMD")}) -> Return=${resultado.get("Return")}`;
    if (codigo < 0) console.warn(`${mensaje} ERROR`);
    else console.log(mensaje);

    // Si falla el registro, no afecta la respuesta al equipo
    if (serial && resultado.get("ID") && Number.isInteger(codigo)) {
      try {
        await commandService.registrarResultado(serial, resultado.get("ID"), codigo);
      } catch (err) {
        console.error("[iclock/devicecmd] No se pudo guardar el resultado", err.message);
      }
    }
  }

  res.send('ok');
};
