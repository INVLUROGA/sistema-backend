// services/reporteSeguimientoService.js
// Reporte de seguimiento de los SOCIOS ACTIVOS a una fecha: los clientes cuya última membresía
// vence en esa fecha o después (no se usa la fecha de inicio), con los datos para agrupar por
// género, edad, distrito, horario, programa y monto. Un registro por cliente: su última membresía,
// igual que "SOCIOS ACTIVOS" en /seguimiento. Solo CHANGE (id_empresa 598).
const { sql, poolPromise } = require("../database/connectionSQLserver");

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const esFechaValida = (fecha) =>
  FORMATO_FECHA.test(String(fecha ?? "")) && !isNaN(new Date(`${fecha}T00:00:00Z`).getTime());

// Retorna el mensaje de error de la fecha o null si es válida
function errorDeFecha(fecha) {
  return esFechaValida(fecha) ? null : "La fecha debe tener el formato YYYY-MM-DD";
}

async function obtenerReporte(fecha) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("fecha", sql.Date, fecha)
    .query(`
      WITH membresias AS (
        SELECT s.id_cli, s.id_membresia,
               CONVERT(char(10), m.fecha_inicio, 23) AS inicio,
               CONVERT(char(10), s.fecha_vencimiento, 23) AS vence,
               CONVERT(char(5), m.horario, 108) AS horario,
               m.tarifa_monto AS monto,
               RTRIM(COALESCE(pc.name_pgm, p.name_pgm)) AS programa,
               ROW_NUMBER() OVER (PARTITION BY s.id_cli ORDER BY s.id_membresia DESC) AS orden
        FROM dbo.tb_seguimientos s
        JOIN dbo.detalle_ventaMembresia m ON m.id = s.id_membresia
        JOIN dbo.tb_venta v ON v.id = m.id_venta AND v.id_empresa = 598
        LEFT JOIN dbo.tb_ProgramaTraining p ON p.id_pgm = m.id_pgm
        LEFT JOIN dbo.detalle_cambioProgramas cp ON cp.id = s.id_cambio
        LEFT JOIN dbo.tb_ProgramaTraining pc ON pc.id_pgm = cp.id_pgm
        WHERE s.flag = 1 AND s.fecha_vencimiento IS NOT NULL
      )
      SELECT mb.id_cli, mb.id_membresia, mb.inicio, mb.vence, mb.horario, mb.monto, mb.programa,
             LTRIM(RTRIM(CONCAT(c.nombre_cli, ' ', c.apPaterno_cli, ' ', c.apMaterno_cli))) AS nombre,
             LTRIM(RTRIM(c.numDoc_cli)) AS dni,
             c.sexo_cli, RTRIM(sx.label_param) AS sexo_label,
             CONVERT(char(10), c.fecha_nacimiento, 23) AS fecha_nacimiento,
             RTRIM(d.distrito) AS distrito
      FROM membresias mb
      JOIN dbo.tb_clientes c ON c.id_cli = mb.id_cli
      LEFT JOIN dbo.tb_parametros sx ON sx.id_param = c.sexo_cli
      LEFT JOIN dbo.tb_distritos d ON d.ubigeo = c.ubigeo_distrito_cli
      -- activo: su última membresía vence en la fecha o después
      WHERE mb.orden = 1 AND mb.vence >= CONVERT(char(10), @fecha, 23)
      ORDER BY nombre
    `);
  return result.recordset.map((r) => ({ ...r, monto: Number(r.monto) || 0 }));
}

module.exports = { errorDeFecha, obtenerReporte };
