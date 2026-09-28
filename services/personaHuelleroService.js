// services/personaHuelleroService.js
// Alta manual de una persona para los huelleros: nombre + DNI (PIN) + BinaryData en texto.
// BinaryData es la plantilla de la huella en base64 (columna BinaryData de dbo.zk_UserData64);
// el HashData interno de la tabla lo calcula la BD al guardar.
// Se guarda en dbo.zk_Users y dbo.zk_UserData64, y se encola el alta en los huelleros activos.
const { sql, poolPromise } = require("../database/connectionSQLserver");
const accUserService = require("./accUserService");
const accHuellaService = require("./accHuellaService");
const accPushService = require("./accPushService");
const userService = require("./userService");

const MAX_LONGITUD_HUELLA = 20000; // una plantilla v10 ocupa ~1.5 KB en base64

/// Normaliza el base64 tal como lo copian las apps: quita espacios, comillas, prefijo
/// "data:...;base64,", barras escapadas de JSON ("\/"), caracteres tecleados por error
/// después del "=" final (ej. "=ç"), acepta base64 URL-safe (- y _) y completa el "="
/// final si falta. Retorna { base64 } o { error } con el carácter inválido.
function normalizarBase64(texto) {
  let s = String(texto)
    .replace(/\\[rn]/g, "") // "\n" escritos como texto
    .replace(/\s+/g, "")
    .replace(/^["']+|["']+$/g, "")
    .replace(/(=+)[^A-Za-z0-9+/=]+$/, "$1") // basura después del "=" final
    .replace(/^data:[^,]*,/i, "")
    .replace(/\\\//g, "/")
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .replace(/=+$/, "");

  const invalido = s.search(/[^A-Za-z0-9+/]/);
  if (invalido !== -1) {
    return {
      error: `El BinaryData tiene un carácter no válido: "${s[invalido]}" (posición ${invalido + 1})`,
    };
  }
  // Un carácter de más solo es aceptable si es una "A" del relleno de ceros del final
  // (algunas apps generan el relleno con un carácter extra); ese relleno se descarta después.
  if (s.length % 4 === 1 && s.endsWith("AA")) s = s.slice(0, -1);
  if (s.length % 4 === 1) {
    return { error: "El BinaryData está incompleto (parece cortado al copiarlo)" };
  }
  return { base64: s + "=".repeat((4 - (s.length % 4)) % 4) };
}

/// Las apps que capturan con el SDK de ZKTeco (lector USB) devuelven el búfer completo
/// de 2048 bytes: la huella real seguida de ceros. Se quitan esos ceros finales para que
/// el equipo reciba solo la plantilla, con su tamaño real (como las que él mismo envía).
function quitarRelleno(base64) {
  const bytes = Buffer.from(base64, "base64");
  let fin = bytes.length;
  while (fin > 0 && bytes[fin - 1] === 0) fin--;
  return fin === 0 ? "" : bytes.subarray(0, fin).toString("base64");
}

/// Valida y normaliza los datos. Retorna { datos } o { error }.
function validarPersona({ nombre, dni, binaryData, dedo }) {
  const nombreLimpio = typeof nombre === "string" ? nombre.trim() : "";
  if (!nombreLimpio) return { error: "El nombre es obligatorio" };
  if (nombreLimpio.length > 40) return { error: "El nombre admite como máximo 40 caracteres" };
  if (/[\t\r\n]/.test(nombreLimpio)) return { error: "El nombre no puede tener tabuladores ni saltos de línea" };

  const dniTexto = String(dni ?? "").trim();
  if (!/^\d{1,9}$/.test(dniTexto) || parseInt(dniTexto, 10) === 0) {
    return { error: "El DNI debe ser numérico (hasta 9 dígitos)" };
  }

  if (typeof binaryData !== "string" || !binaryData.trim()) return { error: "El BinaryData es obligatorio" };
  const { base64: huellaLimpia, error: errorBase64 } = normalizarBase64(binaryData);
  if (errorBase64) return { error: errorBase64 };
  if (!huellaLimpia) return { error: "El BinaryData es obligatorio" };
  if (huellaLimpia.length > MAX_LONGITUD_HUELLA) return { error: "El BinaryData es demasiado largo" };
  const plantilla = quitarRelleno(huellaLimpia);
  if (!plantilla) return { error: "El BinaryData está vacío (solo contiene ceros)" };

  const dedoNumero = dedo === undefined || dedo === "" ? 0 : Number(dedo);
  if (!Number.isInteger(dedoNumero) || dedoNumero < 0 || dedoNumero > 9) {
    return { error: "El dedo debe ser un número del 0 al 9" };
  }

  return {
    datos: {
      nombre: nombreLimpio,
      pin: parseInt(dniTexto, 10),
      plantilla,
      dedo: dedoNumero,
    },
  };
}

async function existeUsuario(pin) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("UserCode", sql.Int, pin)
    .query("SELECT 1 AS existe FROM dbo.zk_Users WHERE UserCode = @UserCode");
  return result.recordset.length > 0;
}

// Autorización de acceso que se da a las personas nuevas (configurable por variables de entorno)
function autorizacionPorDefecto() {
  const franjaHoraria = parseInt(process.env.ZK_ACC_FRANJA_HORARIA, 10);
  const puertas = parseInt(process.env.ZK_ACC_PUERTAS, 10);
  return {
    franjaHoraria: franjaHoraria > 0 ? franjaHoraria : 1,
    puertas: puertas > 0 ? puertas : 1,
  };
}

/// Encola el alta (usuario + autorización + huella) en todos los huelleros activos. Retorna los SN.
async function enviarAHuelleros({ pin, nombre, dedo, plantilla }, ahora = Date.now()) {
  const pool = await poolPromise;
  const { recordset } = await pool
    .request()
    .query("SELECT DeviceSN FROM dbo.zk_Devices WHERE IsActive = 1");

  const id = Math.floor(ahora / 1000) % 1000000000;
  const comandos = [
    accPushService.comandoAltaUsuario(id, { pin, nombre }),
    accPushService.comandoAutorizacion(id + 1, { pin, ...autorizacionPorDefecto() }),
    accPushService.comandoAltaHuella(id + 2, { pin, dedo, plantilla }),
  ];

  // Mismo patrón que broadCastCommand: el comando va como parámetro, nunca concatenado
  for (const CMD of comandos) {
    await pool
      .request()
      .input("CMD", sql.VarChar(sql.MAX), CMD)
      .query(`
        INSERT INTO dbo.zk_QueueCMD (DeviceSN, CMD, CreationTime)
        SELECT DeviceSN, @CMD, FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz')
        FROM dbo.zk_Devices
        WHERE IsActive = 1
      `);
  }
  return recordset.map((d) => d.DeviceSN);
}

/// Registra a la persona. Retorna { ok, status, msg, huelleros }.
async function agregarPersona(body) {
  const { datos, error } = validarPersona(body || {});
  if (error) return { ok: false, status: 400, msg: error };

  if (await existeUsuario(datos.pin)) {
    return { ok: false, status: 409, msg: `Ya existe una persona con el DNI ${datos.pin}` };
  }

  const guardados = await accUserService.guardarUsuarios([
    { UserCode: datos.pin, Name: datos.nombre, Password: null, Card: null, IsActive: true, Role: 0 },
  ]);
  if (guardados !== 1) {
    return { ok: false, status: 500, msg: "No se pudo guardar la persona" };
  }

  const huella = await accHuellaService.guardarHuellas([
    {
      UserCode: datos.pin,
      DataIndex: datos.dedo,
      SizeData: Buffer.from(datos.plantilla, "base64").length,
      Template: datos.plantilla,
    },
  ]);
  if (huella.nuevas + huella.actualizadas !== 1) {
    // Se deshace el alta para no dejar a la persona sin huella
    await userService.deleteUser(datos.pin).catch((err) =>
      console.error(`[zk-personas] No se pudo deshacer el alta de ${datos.pin}`, err)
    );
    return { ok: false, status: 500, msg: "No se pudo guardar la huella; la persona no fue agregada" };
  }

  const huelleros = await enviarAHuelleros(datos);
  console.log(
    `[zk-personas] ${datos.nombre} (DNI ${datos.pin}) agregada y enviada a: ${huelleros.join(", ") || "ningún huellero activo"}`
  );
  return {
    ok: true,
    status: 201,
    msg: "Persona agregada",
    persona: { pin: datos.pin, nombre: datos.nombre, dedo: datos.dedo },
    huelleros,
  };
}

module.exports = {
  autorizacionPorDefecto,
  normalizarBase64,
  quitarRelleno,
  validarPersona,
  agregarPersona,
};
