// services/transactionService.js
const { sql, poolPromise } = require("../database/connectionSQLserver");

// Estado de la marcación cuando la persona está inactiva (membresía vencida o desactivada):
// el huellero la reconoce pero no la deja entrar
const LABEL_MEMBRESIA_INACTIVA = "membresia inactiva";

// Función para insertar una transacción en dbo.zk_Transactions
// Ignora las marcaciones ya guardadas (el equipo reenvía su historial al reiniciarse).
// label_estado se fija con el estado de la persona al recibir la marcación.
// Retorna cuántas marcaciones nuevas se insertaron.
async function insertTransaction(data, deviceSN) {
  const pool = await poolPromise;
  const query = `
        IF NOT EXISTS (
            SELECT 1 FROM dbo.zk_Transactions
            WHERE UserCode = @UserCode AND Device = @Device AND PunchTime = @PunchTime
        )
        INSERT INTO dbo.zk_Transactions (UserCode, Device, PunchTime, UploadTime, label_estado)
        VALUES (@UserCode, @Device, @PunchTime, FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz'),
                (SELECT TOP (1) CASE WHEN u.IsActive = 0 THEN @LabelInactiva END
                 FROM dbo.zk_Users u WHERE u.UserCode = @UserCode))
    `;

  let insertadas = 0;
  // Ejecutar la inserción para cada registro en "data"
  for (let i = 0; i < data.length; i++) {
    let record = data[i];
    try {
      const result = await pool
        .request()
        .input("UserCode", sql.Int, record.UserCode) // El valor de UserId viene del record
        .input("Device", sql.VarChar(20), deviceSN)
        // La hora del equipo viene sin zona horaria: es hora de Perú (TimeZone=-5)
        .input("PunchTime", sql.DateTimeOffset, agregarOffsetManual(record.timestamp))
        .input("LabelInactiva", sql.VarChar(50), LABEL_MEMBRESIA_INACTIVA)
        .query(query);
      const nueva = result.rowsAffected.some((n) => n > 0);
      if (nueva) insertadas++;
      console.log(
        `[iclock/cdata] Marcación ${nueva ? "nueva" : "repetida"} -> SN: ${deviceSN} | PIN: ${record.UserCode} | Hora: ${record.timestamp}`
      );
    } catch (error) {
      console.error(
        `Error inesperado al insertar el registro ${record.UserCode}: ${error.message}`
      );
    }
  }
  return insertadas;
}

function segmentarTramaTrans(trama) {
  const lineas = trama.split("\n"); // Dividir la trama en líneas
  const datosSegmentados = [];

  lineas.forEach((linea) => {
    if (linea.trim() !== "") {
      // Filtrar las líneas vacías
      // Dividir la línea en columnas por espacios múltiples
      const columnas = linea.trim().split(/\s+/);

      // Crear un objeto o almacenar los valores según tu necesidad
      const dato = {
        UserCode: parseInt(columnas[0], 10), // PIN de Usuario
        timestamp: columnas[1] + " " + columnas[2], // Fecha y hora
        status: parseInt(columnas[3], 10), // Status
        verify: parseInt(columnas[4], 10), // Verify
        workcode: parseInt(columnas[5], 10), // Workcode
        reserved1: parseInt(columnas[6], 10), // Reserved
        reserved2: parseInt(columnas[7], 10), // Reserved
        maskflag: parseInt(columnas[8], 10), // MaskFlag
        temp: parseInt(columnas[9], 10), // Temperature
        convtemp: parseInt(columnas[10], 10), // ConvTemperature
      };

      datosSegmentados.push(dato); // Agregar a la lista de datos
    }
  });

  return datosSegmentados;
}

function agregarOffsetManual(fechaSinOffset, offset = "-05:00") {
  // Combinar la fecha sin offset con el offset fijo
  const fechaConOffset = `${fechaSinOffset.replace(" ", "T")}${offset}`;

  // Crear un nuevo objeto Date con la cadena modificada
  const fecha = new Date(fechaConOffset);

  // Devolver la fecha en el formato ISO estándar
  return fecha.toISOString(); // Esto te devuelve en formato UTC
}

// Fecha y hora de Perú (America/Lima) de un Date: { fecha: "2026-09-28", hora: "11:46:13" }
function fechaHoraLima(fecha) {
  if (!fecha) return { fecha: null, hora: null };
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(fecha))
      .map((p) => [p.type, p.value])
  );
  return {
    fecha: `${partes.year}-${partes.month}-${partes.day}`,
    hora: `${partes.hour}:${partes.minute}:${partes.second}`,
  };
}

/// Marcaciones entre dos fechas de Perú (YYYY-MM-DD, ambas incluidas), con el nombre del usuario.
async function listarMarcaciones(desde, hasta) {
  const pool = await poolPromise;
  const inicio = new Date(`${desde}T00:00:00-05:00`);
  const fin = new Date(`${hasta}T00:00:00-05:00`);
  fin.setUTCDate(fin.getUTCDate() + 1); // hasta el final del día "hasta"

  const result = await pool
    .request()
    .input("inicio", sql.DateTimeOffset, inicio)
    .input("fin", sql.DateTimeOffset, fin)
    .query(`
      SELECT t.Id, t.UserCode, RTRIM(u.Name) AS Name, LTRIM(RTRIM(u.dni)) AS Dni, t.Device, t.PunchTime, t.UploadTime,
             t.label_estado AS LabelEstado
      FROM dbo.zk_Transactions t
      LEFT JOIN dbo.zk_Users u ON u.UserCode = t.UserCode
      WHERE t.PunchTime >= @inicio AND t.PunchTime < @fin
      ORDER BY t.PunchTime DESC, t.Id DESC
    `);

  return result.recordset.map((m) => {
    const marcacion = fechaHoraLima(m.PunchTime);
    const recibida = fechaHoraLima(m.UploadTime);
    return {
      id: m.Id,
      pin: m.UserCode,
      dni: m.Dni || null,
      labelEstado: m.LabelEstado || null, // ej. "membresia inactiva"
      nombre: m.Name || null,
      huellero: m.Device,
      fecha: marcacion.fecha,
      hora: marcacion.hora,
      marcacion: m.PunchTime,
      recibida: recibida.fecha ? `${recibida.fecha} ${recibida.hora}` : null,
    };
  });
}

module.exports = {
  LABEL_MEMBRESIA_INACTIVA,
  insertTransaction,
  segmentarTramaTrans,
  agregarOffsetManual,
  fechaHoraLima,
  listarMarcaciones,
};
