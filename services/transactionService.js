// services/transactionService.js
const { enviarMensajesWsp } = require("../config/whatssap-web");
const { sql, poolPromise } = require("../database/connectionSQLserver");

// Estados de la marcación (label_estado), según quién marcó y su membresía ese día
const LABELS_ESTADO = {
  COLABORADOR: "Es colaborador", // empleado activo (tb_empleados)
  ACTIVO_PARA: "activo para ", // + programa de la membresía vigente ese día
  SIN_MEMBRESIA: "cliente sin membresia", // cliente sin membresía vigente
  // Cliente con membresía vigente pero desactivado a mano (zk_Users.IsActive = 0):
  // el huellero lo reconoce pero no lo deja entrar
  INACTIVA: "membresia inactiva",
};

// Calcula @label para @UserCode según el día (Perú) de @PunchTime. Por DNI: zk_Users.dni =
// tb_empleados.numDoc_empl / tb_clientes.numDoc_cli; el programa sale del seguimiento
// (tb_seguimientos -> membresía -> programa) vigente ese día. NULL si no es cliente ni empleado.
const SQL_CALCULAR_LABEL = `
        DECLARE @dni VARCHAR(30), @usuarioActivo BIT, @programa VARCHAR(100), @tieneMembresia BIT = 0;
        DECLARE @dia DATE = CAST(SWITCHOFFSET(@PunchTime, '-05:00') AS DATE);
        SELECT TOP (1) @dni = LTRIM(RTRIM(dni)), @usuarioActivo = IsActive FROM dbo.zk_Users WHERE UserCode = @UserCode;

        SELECT TOP (1) @tieneMembresia = 1, @programa = COALESCE(RTRIM(p.name_pgm), 'su programa')
        FROM dbo.tb_seguimientos s
        JOIN dbo.tb_clientes c ON c.id_cli = s.id_cli
        JOIN dbo.detalle_ventaMembresia m ON m.id = s.id_membresia
        LEFT JOIN dbo.tb_ProgramaTraining p ON p.id_pgm = m.id_pgm
        WHERE s.flag = 1 AND LTRIM(RTRIM(c.numDoc_cli)) = @dni
          AND CAST(m.fecha_inicio AS DATE) <= @dia AND CAST(s.fecha_vencimiento AS DATE) >= @dia
        ORDER BY m.fecha_inicio DESC;

        DECLARE @label VARCHAR(50) = CASE
          WHEN @dni IS NULL OR @dni = '' THEN NULL
          WHEN EXISTS (SELECT 1 FROM dbo.tb_empleados e WHERE e.flag = 1 AND LTRIM(RTRIM(e.numDoc_empl)) = @dni)
            THEN @LabelColaborador
          WHEN @tieneMembresia = 1 AND ISNULL(@usuarioActivo, 1) = 1 THEN LEFT(CONCAT(@LabelActivoPara, @programa), 50)
          WHEN @tieneMembresia = 1 THEN @LabelInactiva
          WHEN EXISTS (SELECT 1 FROM dbo.tb_clientes c WHERE c.flag = 1 AND LTRIM(RTRIM(c.numDoc_cli)) = @dni)
            THEN @LabelSinMembresia
          ELSE NULL
        END;
`;
const inputsLabels = (request) =>
  request
    .input("LabelColaborador", sql.VarChar(50), LABELS_ESTADO.COLABORADOR)
    .input("LabelActivoPara", sql.VarChar(50), LABELS_ESTADO.ACTIVO_PARA)
    .input("LabelSinMembresia", sql.VarChar(50), LABELS_ESTADO.SIN_MEMBRESIA)
    .input("LabelInactiva", sql.VarChar(50), LABELS_ESTADO.INACTIVA);

// Teléfono de tb_clientes.tel_cli -> número de WhatsApp para UltraMsg (51 + celular de Perú).
// Acepta "951473211", "+51 951 473 211", "51951473211". Devuelve null si no es un celular válido.
function telefonoWsp(telefono) {
  const digitos = String(telefono ?? "").replace(/\D/g, "");
  if (/^9\d{8}$/.test(digitos)) return `51${digitos}`;
  if (/^519\d{8}$/.test(digitos)) return digitos;
  return null;
}

// Aviso de WhatsApp al cliente sin membresía que intenta entrar: UNO por teléfono y día (Perú).
// Se reserva antes de enviar en dbo.tb_mensaje_membresia (índice único tipo+telefono+fecha):
// si ya existe (otra marcación del mismo día, otro servidor), no se envía de nuevo.
// fecha_vencimiento guarda aquí el día de la marcación.
const TIPO_AVISO_SIN_MEMBRESIA = "acceso-sin-membresia";
const mensajeSinMembresia = (nombre) => `
👋 HOLA, ${nombre || "(sin nombre)"}.

Tu membresía ha llegado a su fecha de vencimiento y, por ello, tu acceso se encuentra temporalmente inhabilitado.

🔄 Es momento de renovar tu membresía para continuar entrenando en Change.

Acércate a nuestro asesor para gestionar tu renovación y seguir con tu cambio en CHANGE. 💪
          `;

async function avisarSinMembresia({ numero, dia, id_cli, nombre }) {
  const pool = await poolPromise;
  let reserva;
  try {
    reserva = await pool
      .request()
      .input("tipo", sql.NVarChar(20), TIPO_AVISO_SIN_MEMBRESIA)
      .input("telefono", sql.NVarChar(20), numero)
      .input("dia", sql.Date, dia)
      .input("id_cli", sql.Int, id_cli ?? null)
      .query(`
        INSERT INTO dbo.tb_mensaje_membresia (tipo, telefono, fecha_vencimiento, id_cli, estado, createdAt, updatedAt)
        OUTPUT inserted.id
        SELECT @tipo, @telefono, @dia, @id_cli, 'pendiente', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
        WHERE NOT EXISTS (
          SELECT 1 FROM dbo.tb_mensaje_membresia
          WHERE tipo = @tipo AND telefono = @telefono AND fecha_vencimiento = @dia
        );
      `);
  } catch (error) {
    // 2627/2601: otra marcación lo reservó al mismo tiempo (índice único)
    if ([2627, 2601].includes(error.number)) return { enviado: false, motivo: "ya-avisado" };
    throw error;
  }
  const id = reserva.recordset?.[0]?.id;
  if (!id) {
    console.log(`[iclock/cdata] WhatsApp a ${numero} omitido: ya se le avisó el ${dia}`);
    return { enviado: false, motivo: "ya-avisado" };
  }

  const respuesta = await enviarMensajesWsp(numero, mensajeSinMembresia(nombre));
  const errorEnvio = !respuesta?.ok
    ? respuesta?.msg || "Error desconocido"
    : respuesta.data?.error
      ? JSON.stringify(respuesta.data.error)
      : null;
  // No se reintenta: un error de red puede haber enviado igual
  await pool
    .request()
    .input("id", sql.Int, id)
    .input("estado", sql.NVarChar(15), errorEnvio ? "error" : "enviado")
    .input("detalle", sql.NVarChar(500), errorEnvio ? String(errorEnvio).slice(0, 500) : null)
    .query(`UPDATE dbo.tb_mensaje_membresia SET estado = @estado, detalle = @detalle, updatedAt = SYSDATETIMEOFFSET() WHERE id = @id;`);
  return { enviado: !errorEnvio, motivo: errorEnvio || null };
}

// Función para insertar una transacción en dbo.zk_Transactions
// Ignora las marcaciones ya guardadas (el equipo reenvía su historial al reiniciarse).
// label_estado se fija al recibir la marcación (colaborador / activo para [programa] / sin membresía).
// Retorna cuántas marcaciones nuevas se insertaron.
async function insertTransaction(data, deviceSN) {
  const pool = await poolPromise;
  const query = `
        IF NOT EXISTS (
            SELECT 1 FROM dbo.zk_Transactions
            WHERE UserCode = @UserCode AND Device = @Device AND PunchTime = @PunchTime
        )
        BEGIN
        ${SQL_CALCULAR_LABEL}
        INSERT INTO dbo.zk_Transactions (UserCode, Device, PunchTime, UploadTime, label_estado)
        VALUES (@UserCode, @Device, @PunchTime, FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz'), @label);
        -- Con qué estado quedó la marcación, y datos para avisar al cliente
        SELECT @label AS label, @dni AS dni, CONVERT(CHAR(10), @dia, 23) AS dia,
               (SELECT TOP (1) c.id_cli FROM dbo.tb_clientes c
                WHERE c.flag = 1 AND LTRIM(RTRIM(c.numDoc_cli)) = @dni ORDER BY c.id_cli DESC) AS id_cli,
               (SELECT TOP (1) RTRIM(Name) FROM dbo.zk_Users WHERE UserCode = @UserCode) AS nombre,
               (SELECT TOP (1) LTRIM(RTRIM(c.tel_cli)) FROM dbo.tb_clientes c
                WHERE c.flag = 1 AND LTRIM(RTRIM(c.numDoc_cli)) = @dni AND NULLIF(LTRIM(RTRIM(c.tel_cli)), '') IS NOT NULL
                ORDER BY c.id_cli DESC) AS telefono;
        END
    `;

  let insertadas = 0;
  // Ejecutar la inserción para cada registro en "data"
  for (let i = 0; i < data.length; i++) {
    let record = data[i];
    try {
      const result = await inputsLabels(pool.request())
        .input("UserCode", sql.Int, record.UserCode) // El valor de UserId viene del record
        .input("Device", sql.VarChar(20), deviceSN)
        // La hora del equipo viene sin zona horaria: es hora de Perú (TimeZone=-5)
        .input("PunchTime", sql.DateTimeOffset, agregarOffsetManual(record.timestamp))
        .query(query);
      // Si ya existía, no se ejecuta nada dentro del IF (rowsAffected vacío). Si es nueva, el
      // último rowsAffected es el del SELECT final (1 fila).
      const nueva = result.rowsAffected.length > 0 && result.rowsAffected[result.rowsAffected.length - 1] > 0;
      if (nueva) insertadas++;
      console.log(
        `[iclock/cdata] Marcación ${nueva ? "nueva" : "repetida"} -> SN: ${deviceSN} | PIN: ${record.UserCode} | Hora: ${record.timestamp}`
      );
      const estado = nueva ? result.recordset?.[0] : null;
      if (estado?.label === LABELS_ESTADO.SIN_MEMBRESIA) {
        const numero = telefonoWsp(estado.telefono);
        console.log(
          `[iclock/cdata] ⚠ CLIENTE SIN MEMBRESÍA marcó -> ${estado.nombre || "(sin nombre)"} | DNI: ${estado.dni} | PIN: ${record.UserCode} | WhatsApp: ${numero || `no válido (${estado.telefono || "sin teléfono"})`}`
        );
        // En segundo plano: no retrasa la respuesta al huellero
        if (numero) {
          avisarSinMembresia({ numero, dia: estado.dia, id_cli: estado.id_cli, nombre: estado.nombre }).catch((error) =>
            console.error(`[iclock/cdata] Falló el aviso de WhatsApp a ${numero}: ${error.message}`)
          );
        }
      }
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
  LABELS_ESTADO,
  telefonoWsp,
  avisarSinMembresia,
  SQL_CALCULAR_LABEL,
  insertTransaction,
  segmentarTramaTrans,
  agregarOffsetManual,
  fechaHoraLima,
  listarMarcaciones,
};
