// services/transactionService.js
const { sql, poolPromise } = require("../database/connectionSQLserver");

// Función para insertar una transacción en dbo.zk_Transactions
async function insertTransaction(data, deviceSN) {
  const pool = await poolPromise;
  const query = `
        INSERT INTO dbo.zk_Transactions (UserCode, Device, PunchTime, UploadTime)
        VALUES (@UserCode, @Device, @PunchTime, FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz'))
    `;

  // Ejecutar la inserción para cada registro en "data"
  for (let i = 0; i < data.length; i++) {
    let record = data[i];
    try {
      await pool
        .request()
        .input("UserCode", sql.Int, record.UserCode) // El valor de UserId viene del record
        .input("Device", sql.VarChar(20), deviceSN)
        .input("PunchTime", sql.DateTimeOffset, record.timestamp)
        .query(query);
    } catch (error) {
      console.error(
        `Error inesperado al insertar el registro ${record.UserCode}: ${error.message}`
      );
    }
  }
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
  const fechaConOffset = `${fechaSinOffset}${offset}`;

  // Crear un nuevo objeto Date con la cadena modificada
  const fecha = new Date(fechaConOffset);

  // Devolver la fecha en el formato ISO estándar
  return fecha.toISOString(); // Esto te devuelve en formato UTC
}

module.exports = {
  insertTransaction,
  segmentarTramaTrans,
  agregarOffsetManual,
};
