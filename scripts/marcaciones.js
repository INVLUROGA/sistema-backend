// Muestra las últimas marcaciones recibidas de los huelleros ZKTeco.
// Uso: npm run marcaciones          (últimas 20)
//      npm run marcaciones -- 100   (últimas 100)
const { sql, poolPromise } = require("../database/connectionSQLserver");

const cantidad = Math.min(parseInt(process.argv[2], 10) || 20, 1000);
const formatoLima = (fecha) =>
  fecha ? fecha.toLocaleString("es-PE", { timeZone: "America/Lima" }) : "-";

(async () => {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("cantidad", sql.Int, cantidad)
    .query(`
      SELECT TOP (@cantidad) t.Id, t.UserCode, u.Name, t.Device, t.PunchTime, t.UploadTime
      FROM dbo.zk_Transactions t
      LEFT JOIN dbo.zk_Users u ON u.UserCode = t.UserCode
      ORDER BY t.PunchTime DESC, t.Id DESC
    `);

  console.log(`\nÚltimas ${result.recordset.length} marcaciones (hora de Lima)\n`);
  console.table(
    result.recordset.map((m) => ({
      "Hora marcación": formatoLima(m.PunchTime),
      PIN: m.UserCode,
      Nombre: m.Name ? m.Name.trim() : "(no registrado)",
      Huellero: m.Device,
      Recibida: formatoLima(m.UploadTime),
    }))
  );
  process.exit(0);
})().catch((err) => {
  console.error("Error al consultar las marcaciones", err.message);
  process.exit(1);
});
