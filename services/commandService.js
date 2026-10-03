// services/commandService.js
const { sql, poolPromise } = require("../database/connectionSQLserver");

// Función para insertar un comando en dbo.zk_QueueCMD.
// segundosDespues: fecha el comando unos segundos más tarde para que la cola lo entregue
// después de otro comando insertado en el mismo segundo (CreationTime se guarda al segundo).
async function insertCommand(DeviceSN, CMD, segundosDespues = 0) {
  const pool = await poolPromise;
  const query = `
        INSERT INTO dbo.zk_QueueCMD (DeviceSN, CMD, CreationTime)
        VALUES (@DeviceSN, @CMD, FORMAT(DATEADD(second, @segundosDespues, SYSDATETIMEOFFSET()), 'yyyy-MM-dd HH:mm:ss zzz'))
    `;

  // Ejecutar la consulta para insertar el comando
  await pool
    .request()
    .input("DeviceSN", sql.VarChar(20), DeviceSN)
    .input("CMD", sql.VarChar(sql.MAX), CMD)
    .input("segundosDespues", sql.Int, segundosDespues)
    .query(query);
}

/// ¿Hay una consulta de datos (DATA QUERY) pendiente para el equipo? (sincronización en curso)
async function hayConsultaPendiente(DeviceSN) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("DeviceSN", sql.VarChar(20), DeviceSN)
    .query(`
        SELECT COUNT(*) AS n
        FROM dbo.zk_QueueCMD
        WHERE DeviceSN = @DeviceSN AND CMD LIKE 'C:%:DATA QUERY %'
    `);
  return result.recordset[0].n > 0;
}

// Comandos que se entregan por cada /iclock/getrequest. Con varios comandos en una sola
// respuesta el SpeedFace descartaba algunos (ej. la huella de un usuario recién creado);
// uno por petición es lo probado. El equipo pregunta cada ~2 s (RequestDelay).
const COMANDOS_POR_PETICION = 1;

// Función para obtener el comando más antiguo pendiente por DeviceSN
async function getRecentCommandByDeviceSN(DeviceSN) {
  const pool = await poolPromise;
  // CreationTime se guarda al segundo: se desempata por Id (orden de inserción)
  const query = `
        SELECT TOP (${COMANDOS_POR_PETICION}) Id, CMD
        FROM dbo.zk_QueueCMD
        WHERE DeviceSN = @DeviceSN
        ORDER BY CreationTime ASC, Id ASC
    `;

  const result = await pool
    .request()
    .input("DeviceSN", sql.VarChar(20), DeviceSN)
    .query(query);

  if (result.recordset.length > 0) {
    return result.recordset; // Retorna el comando más reciente
  }
  return null; // Retorna null si no se encontró
}

// Función para eliminar un comando por id
async function deleteCommandById(Id) {
  const pool = await poolPromise;
  const query = `
        DELETE FROM dbo.zk_QueueCMD
        WHERE Id = @Id
    `;

  const result = await pool.request().input("Id", sql.Int, Id).query(query);

  return result.rowsAffected[0]; // Retorna cuántas filas fueron afectadas
}

// Servicio para consultar todos los DeviceSN de dbo.zk_Devices e insertar en dbo.zk_QueueCMD
async function broadCastCommand(broadcast_cmd) {
  try {
    // Conectarse a la base de datos
    const pool = await poolPromise;

    // Inserta el comando para todos los dispositivos activos en una sola operación.
    // El comando va como parámetro (nunca concatenado): los nombres con comillas
    // (ej. D'Angelo) no rompen la consulta ni permiten inyección SQL.
    const insertQuery = `
            INSERT INTO dbo.zk_QueueCMD (DeviceSN, CMD, CreationTime)
            SELECT DeviceSN, @CMD, FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz')
            FROM dbo.zk_Devices
            WHERE IsActive = 1
        `;

    const result = await pool
      .request()
      .input("CMD", sql.VarChar(sql.MAX), broadcast_cmd)
      .query(insertQuery);

    // Verificar si se han encontrado dispositivos
    const insertados = result.rowsAffected[0];
    if (insertados === 0) {
      console.log("No se encontraron dispositivos activos.");
      return;
    }
    console.log(`Comandos insertados para ${insertados} dispositivos.`);
  } catch (err) {
    console.error("Error al procesar dispositivos e insertar comandos:", err);
    throw new Error("Error en el servicio");
  }
}

// Qué hace un comando de la cola y para qué persona (PIN). Retorna null si no es de una persona
// (ej. DATA QUERY). Acepta el formato de control de acceso (Pin=) y el de asistencia (PIN=).
const OPERACIONES = {
  "UPDATE user": "alta del usuario",
  "UPDATE userinfo": "alta del usuario",
  "UPDATE templatev10": "envío de huella",
  "UPDATE fingertmp": "envío de huella",
  "UPDATE biodata": "envío de huella",
  "UPDATE userauthorize": "autorización de acceso",
  "DELETE user": "borrado del usuario",
  "DELETE userinfo": "borrado del usuario",
  "DELETE templatev10": "borrado de huella",
  "DELETE fingertmp": "borrado de huella",
  "DELETE biodata": "borrado de huella",
  "DELETE userauthorize": "borrado de autorización",
};
function describirComando(CMD) {
  const texto = String(CMD);
  const m = /^C:(\d+):DATA (UPDATE|DELETE) (\w+)\s[^]*?\bPIN=(\d+)/i.exec(texto);
  if (!m) return null;
  const tipo = `${m[2].toUpperCase()} ${m[3].toLowerCase()}`;
  // Dedo: FingerID= (control de acceso), FID= (asistencia) o No= (biodata)
  const dedo = /(?:^|\t)(?:FingerID|FID|No)=(\d)(?:\t|$)/i.exec(texto);
  return {
    cmdId: m[1],
    pin: parseInt(m[4], 10),
    dedo: dedo ? parseInt(dedo[1], 10) : null,
    operacion: OPERACIONES[tipo] || tipo.toLowerCase(),
    esBorrado: m[2].toUpperCase() === "DELETE",
  };
}

const operacionDe = (CMD, comando = describirComando(CMD)) =>
  (comando?.operacion || (/:DATA QUERY /.test(CMD) ? "consulta de datos" : "otro comando")).slice(0, 40);

/// Registra en dbo.zk_CommandLog los comandos que /iclock/getrequest acaba de entregar al equipo,
/// para luego guardar el resultado que el equipo informa en /iclock/devicecmd.
/// Si el comando ya se había registrado al pedirlo (borrados), solo marca la entrega.
async function registrarEntregados(DeviceSN, comandos) {
  const pool = await poolPromise;
  for (const CMD of comandos) {
    const cmdId = /^C:(\d+):/.exec(String(CMD))?.[1];
    if (!cmdId) continue;
    const comando = describirComando(CMD);
    const marcado = await pool
      .request()
      .input("DeviceSN", sql.VarChar(20), DeviceSN)
      .input("CmdId", sql.VarChar(20), cmdId)
      .query(`
        WITH registrado AS (
          SELECT TOP (1) EntregadoEn
          FROM dbo.zk_CommandLog
          WHERE DeviceSN = @DeviceSN AND CmdId = @CmdId AND EntregadoEn IS NULL
          ORDER BY Id DESC
        )
        UPDATE registrado SET EntregadoEn = SYSUTCDATETIME()
      `);
    if (marcado.rowsAffected[0] > 0) continue;

    await pool
      .request()
      .input("DeviceSN", sql.VarChar(20), DeviceSN)
      .input("CmdId", sql.VarChar(20), cmdId)
      .input("Pin", sql.Int, comando?.pin ?? null)
      .input("Dedo", sql.Int, comando?.dedo ?? null)
      .input("Operacion", sql.VarChar(40), operacionDe(CMD, comando))
      .query(`
        INSERT INTO dbo.zk_CommandLog (DeviceSN, CmdId, Pin, Dedo, Operacion, EntregadoEn)
        VALUES (@DeviceSN, @CmdId, @Pin, @Dedo, @Operacion, SYSUTCDATETIME())
      `);
  }
}

/// Registra en dbo.zk_CommandLog los comandos recién encolados (sin marca de entrega), dentro de
/// la transacción del borrado. Así se puede seguir el estado del borrado aunque la persona o la
/// huella ya no estén en la BD. filas: [{ DeviceSN, CMD }]
async function registrarPedidos(transaccion, filas, nombre = null) {
  for (const { DeviceSN, CMD } of filas) {
    const cmdId = /^C:(\d+):/.exec(String(CMD))?.[1];
    if (!cmdId) continue;
    const comando = describirComando(CMD);
    await new sql.Request(transaccion)
      .input("DeviceSN", sql.VarChar(20), DeviceSN)
      .input("CmdId", sql.VarChar(20), cmdId)
      .input("Pin", sql.Int, comando?.pin ?? null)
      .input("Dedo", sql.Int, comando?.dedo ?? null)
      .input("Operacion", sql.VarChar(40), operacionDe(CMD, comando))
      .input("Nombre", sql.VarChar(40), nombre ? String(nombre).slice(0, 40) : null)
      .query(`
        INSERT INTO dbo.zk_CommandLog (DeviceSN, CmdId, Pin, Dedo, Operacion, Nombre)
        VALUES (@DeviceSN, @CmdId, @Pin, @Dedo, @Operacion, @Nombre)
      `);
  }
}

/// Guarda el Return que el equipo informó para un comando (el último entregado con ese ID).
async function registrarResultado(DeviceSN, cmdId, resultado) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("DeviceSN", sql.VarChar(20), DeviceSN)
    .input("CmdId", sql.VarChar(20), String(cmdId))
    .input("Resultado", sql.Int, resultado)
    .query(`
      WITH ultimo AS (
        SELECT TOP (1) Resultado, ResultadoEn
        FROM dbo.zk_CommandLog
        WHERE DeviceSN = @DeviceSN AND CmdId = @CmdId AND Resultado IS NULL
        ORDER BY Id DESC
      )
      UPDATE ultimo SET Resultado = @Resultado, ResultadoEn = SYSUTCDATETIME()
    `);
  return result.rowsAffected[0] > 0;
}

// Tiempo máximo razonable para que el equipo responda un comando entregado
const SEGUNDOS_ESPERA_CONFIRMACION = 120;

/// Último resultado de cada operación (por persona, huellero y dedo) en los últimos 30 días.
/// Map pin -> [{ DeviceSN, dedo, operacion, estado, codigo, nombre, segundosDesdePedido }]
/// estado: 'esperando' | 'sin_confirmar' | 'error' | 'confirmado', o 'registrado' si se registró
/// al pedirlo y no tiene marca de entrega (si ya no está en la cola, el huellero lo recogió).
async function listarResultadosPorPersona() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    WITH ultimos AS (
      SELECT DeviceSN, Pin, Dedo, Operacion, Resultado, Nombre, EntregadoEn,
             DATEDIFF(second, EntregadoEn, SYSUTCDATETIME()) AS Segundos,
             DATEDIFF(second, CreadoEn, SYSUTCDATETIME()) AS SegundosDesdePedido,
             ROW_NUMBER() OVER (PARTITION BY Pin, DeviceSN, ISNULL(Dedo, -1), Operacion ORDER BY Id DESC) AS n
      FROM dbo.zk_CommandLog
      WHERE Pin IS NOT NULL AND CreadoEn >= DATEADD(day, -30, SYSUTCDATETIME())
    )
    SELECT DeviceSN, Pin, Dedo, Operacion, Resultado, Nombre, EntregadoEn, Segundos, SegundosDesdePedido
    FROM ultimos WHERE n = 1
  `);

  const porPersona = new Map();
  for (const r of result.recordset) {
    const estado =
      r.EntregadoEn === null
        ? "registrado"
        : r.Resultado === null
          ? r.Segundos <= SEGUNDOS_ESPERA_CONFIRMACION
            ? "esperando"
            : "sin_confirmar"
          : r.Resultado < 0
            ? "error"
            : "confirmado";
    const lista = porPersona.get(r.Pin) || [];
    lista.push({
      DeviceSN: r.DeviceSN,
      dedo: r.Dedo,
      operacion: r.Operacion,
      estado,
      codigo: r.Resultado,
      nombre: r.Nombre,
      segundosDesdePedido: r.SegundosDesdePedido,
    });
    porPersona.set(r.Pin, lista);
  }
  return porPersona;
}

/// Comandos pendientes en la cola, agrupados por persona (PIN):
/// Map pin -> { huelleros: [SN...], operaciones: [...], esBorrado }
async function listarPendientesPorPersona() {
  const pool = await poolPromise;
  // El PIN va al inicio del comando: no hace falta traer la plantilla completa de la huella
  const result = await pool.request().query(`
        SELECT DeviceSN, LEFT(CMD, 300) AS CMD
        FROM dbo.zk_QueueCMD
        ORDER BY CreationTime ASC, Id ASC
    `);

  const pendientes = new Map();
  for (const { DeviceSN, CMD } of result.recordset) {
    const comando = describirComando(CMD);
    if (!comando) continue;
    const actual =
      pendientes.get(comando.pin) || { huelleros: [], operaciones: [], dedos: [], dedosBorrando: [], esBorrado: false };
    if (!actual.huelleros.includes(DeviceSN)) actual.huelleros.push(DeviceSN);
    if (!actual.operaciones.includes(comando.operacion)) actual.operaciones.push(comando.operacion);
    // dedos: huellas que se están enviando; dedosBorrando: huellas que se están borrando
    const lista = comando.esBorrado ? actual.dedosBorrando : actual.dedos;
    if (comando.dedo !== null && !lista.includes(comando.dedo)) lista.push(comando.dedo);
    actual.esBorrado = actual.esBorrado || comando.esBorrado;
    pendientes.set(comando.pin, actual);
  }
  return pendientes;
}

module.exports = {
  registrarPedidos,
  registrarEntregados,
  registrarResultado,
  listarResultadosPorPersona,
  hayConsultaPendiente,
  describirComando,
  listarPendientesPorPersona,
  getRecentCommandByDeviceSN,
  deleteCommandById,
  insertCommand,
  broadCastCommand,
};
