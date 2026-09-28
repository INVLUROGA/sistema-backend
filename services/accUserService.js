// services/accUserService.js
// Usuarios de los equipos de CONTROL DE ACCESO (PUSH acc).
// El servidor pide la lista con el comando "DATA QUERY tablename=user" y el equipo
// la envía a POST /iclock/querydata (o a /iclock/cdata?table=tabledata al enrolar).
const { sql, poolPromise } = require("../database/connectionSQLserver");
const commandService = require("./commandService");

const ESPERA_ENTRE_SOLICITUDES_MS = 10 * 60 * 1000;
const ultimaSolicitud = new Map(); // DeviceSN -> ms de la última solicitud de usuarios

// Trama: "user uid=1	cardno=0	pin=41235478	password=	group=1	starttime=0	endtime=0	name=Juan Perez	privilege=0	disable=0	verify=0"
function segmentarTramaUsuarios(trama) {
  return String(trama)
    .split("\n")
    .map((linea) => linea.trim())
    .filter((linea) => /^user\s/i.test(linea))
    .map((linea) => {
      const campos = {};
      for (const par of linea.replace(/^user\s+/i, "").split("\t")) {
        const i = par.indexOf("=");
        if (i > 0) campos[par.slice(0, i).trim().toLowerCase()] = par.slice(i + 1).trim();
      }
      const password = /^\d{1,9}$/.test(campos.password || "") ? parseInt(campos.password, 10) : null;
      return {
        UserCode: parseInt(campos.pin, 10),
        Name: (campos.name || "").slice(0, 40),
        Password: password,
        Card: campos.cardno && campos.cardno !== "0" ? campos.cardno.slice(0, 20) : null,
        IsActive: campos.disable !== "1",
        Role: parseInt(campos.privilege, 10) || 0,
      };
    })
    .filter((u) => Number.isInteger(u.UserCode) && u.UserCode > 0);
}

/// Inserta o actualiza los usuarios en dbo.zk_Users. Retorna cuántos se guardaron.
async function guardarUsuarios(usuarios) {
  const pool = await poolPromise;
  const query = `
        MERGE dbo.zk_Users AS destino
        USING (SELECT @UserCode AS UserCode) AS origen
        ON destino.UserCode = origen.UserCode
        WHEN MATCHED THEN
            UPDATE SET Name = @Name, Password = @Password, Card = @Card, IsActive = @IsActive, Role = @Role,
                       UpdateTime = FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz')
        WHEN NOT MATCHED THEN
            INSERT (UserCode, Name, Password, Card, CreationTime, UpdateTime, IsActive, Role)
            VALUES (@UserCode, @Name, @Password, @Card, FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz'),
                    FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz'), @IsActive, @Role);
    `;

  let guardados = 0;
  for (const usuario of usuarios) {
    try {
      await pool
        .request()
        .input("UserCode", sql.Int, usuario.UserCode)
        .input("Name", sql.NVarChar(40), usuario.Name)
        .input("Password", sql.Int, usuario.Password)
        .input("Card", sql.VarChar(20), usuario.Card)
        .input("IsActive", sql.Bit, usuario.IsActive)
        .input("Role", sql.Int, usuario.Role)
        .query(query);
      guardados++;
    } catch (error) {
      console.error(`Error al guardar el usuario ${usuario.UserCode}: ${error.message}`);
    }
  }
  return guardados;
}

/// Encola el comando para que el equipo envíe todos sus usuarios.
/// Con forzar=false respeta una espera de 10 min por equipo para no saturarlo.
async function solicitarUsuarios(DeviceSN, forzar = false, ahora = Date.now()) {
  const ultima = ultimaSolicitud.get(DeviceSN);
  if (!forzar && ultima !== undefined && ahora - ultima < ESPERA_ENTRE_SOLICITUDES_MS) {
    return false;
  }
  ultimaSolicitud.set(DeviceSN, ahora);
  const id = Math.floor(ahora / 1000) % 1000000000;
  await commandService.insertCommand(
    DeviceSN,
    `C:${id}:DATA QUERY tablename=user,fielddesc=*,filter=*`
  );
  console.log(`[zk-usuarios] Lista de usuarios solicitada al equipo ${DeviceSN}`);
  return true;
}

/// Si alguno de los PIN no está en dbo.zk_Users, pide los usuarios al equipo.
async function verificarUsuariosDesconocidos(DeviceSN, pins) {
  const unicos = [...new Set(pins)].filter((pin) => Number.isInteger(pin) && pin > 0);
  if (unicos.length === 0) return false;

  const pool = await poolPromise;
  const request = pool.request();
  const parametros = unicos.map((pin, i) => {
    request.input(`pin${i}`, sql.Int, pin);
    return `@pin${i}`;
  });
  const result = await request.query(
    `SELECT UserCode FROM dbo.zk_Users WHERE UserCode IN (${parametros.join(",")})`
  );
  const existentes = new Set(result.recordset.map((r) => r.UserCode));
  const desconocidos = unicos.filter((pin) => !existentes.has(pin));
  if (desconocidos.length === 0) return false;

  console.warn(`[zk-usuarios] PIN no registrados en ${DeviceSN}: ${desconocidos.join(", ")}`);
  return solicitarUsuarios(DeviceSN);
}

/// Personas registradas para los huelleros (dbo.zk_Users) con los dedos que tienen huella.
async function listarPersonas() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT u.UserCode, RTRIM(u.Name) AS Name, u.IsActive, u.CreationTime,
           STRING_AGG(CAST(h.DataIndex AS VARCHAR(2)), ',') WITHIN GROUP (ORDER BY h.DataIndex) AS Dedos
    FROM dbo.zk_Users u
    LEFT JOIN dbo.zk_UserData64 h ON h.UserCode = u.UserCode AND h.DataLabel = 'FP'
    GROUP BY u.UserCode, u.Name, u.IsActive, u.CreationTime
    ORDER BY u.CreationTime DESC, u.UserCode
  `);

  return result.recordset.map((u) => {
    const dedos = u.Dedos ? [...new Set(u.Dedos.split(",").map(Number))] : [];
    return {
      pin: u.UserCode,
      nombre: u.Name,
      activo: u.IsActive !== false,
      dedos,
      huellas: dedos.length,
      registrado: u.CreationTime
        ? new Date(u.CreationTime).toLocaleDateString("en-CA", { timeZone: "America/Lima" })
        : null,
    };
  });
}

function limpiarSolicitudes() {
  ultimaSolicitud.clear();
}

module.exports = {
  segmentarTramaUsuarios,
  guardarUsuarios,
  solicitarUsuarios,
  verificarUsuariosDesconocidos,
  listarPersonas,
  limpiarSolicitudes,
};
