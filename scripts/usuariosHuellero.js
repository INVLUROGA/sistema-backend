// Pide a los huelleros de control de acceso su lista de usuarios (nombres por PIN).
// El equipo la envía en su siguiente conexión (unos segundos) a POST /iclock/querydata.
// Uso: npm run usuarios-huellero              (todos los equipos activos)
//      npm run usuarios-huellero -- <SN>      (solo un equipo)
const { poolPromise } = require("../database/connectionSQLserver");
const accUserService = require("../services/accUserService");

(async () => {
  const pool = await poolPromise;
  const snArgumento = process.argv[2];
  const equipos = snArgumento
    ? [snArgumento]
    : (await pool.request().query("SELECT DeviceSN FROM dbo.zk_Devices WHERE IsActive = 1"))
        .recordset.map((d) => d.DeviceSN);

  for (const DeviceSN of equipos) {
    await accUserService.solicitarUsuarios(DeviceSN, true);
  }
  console.log("\nListo. Los nombres llegarán cuando el equipo se conecte (npm run dev debe estar corriendo).");
  process.exit(0);
})().catch((err) => {
  console.error("Error al solicitar los usuarios", err.message);
  process.exit(1);
});
