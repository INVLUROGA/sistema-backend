// Pide a los huelleros de control de acceso todas las huellas de sus usuarios.
// El equipo las envía en su siguiente conexión a POST /iclock/querydata y se guardan
// en dbo.zk_UserData64 (sin duplicar: solo nuevas o cambiadas).
// Uso: npm run huellas-huellero              (todos los equipos activos)
//      npm run huellas-huellero -- <SN>      (solo un equipo)
const { poolPromise } = require("../database/connectionSQLserver");
const accHuellaService = require("../services/accHuellaService");

(async () => {
  const pool = await poolPromise;
  const snArgumento = process.argv[2];
  const equipos = snArgumento
    ? [snArgumento]
    : (await pool.request().query("SELECT DeviceSN FROM dbo.zk_Devices WHERE IsActive = 1"))
        .recordset.map((d) => d.DeviceSN);

  for (const DeviceSN of equipos) {
    await accHuellaService.solicitarHuellas(DeviceSN);
  }
  console.log("\nListo. Las huellas llegarán cuando el equipo se conecte (npm run dev debe estar corriendo).");
  process.exit(0);
})().catch((err) => {
  console.error("Error al solicitar las huellas", err.message);
  process.exit(1);
});
