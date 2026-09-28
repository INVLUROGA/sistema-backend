// services/accPushService.js
// Protocolo PUSH de CONTROL DE ACCESO (equipos DeviceType=acc, ej. SpeedFace-V3L).
// Es distinto al de asistencia (ATTLOG): el equipo se registra con POST /iclock/registry,
// pide su configuración con POST /iclock/push y envía los eventos como table=rtlog.
const crypto = require("crypto");

// Código fijo por SN (el equipo lo guarda y lo reenvía; no necesita ser secreto)
function registryCode(DeviceSN) {
  return crypto.createHash("sha1").update(`zk-acc-${DeviceSN}`).digest("hex").slice(0, 10);
}

function configuracionAcc(DeviceSN) {
  return [
    "registry=ok",
    `RegistryCode=${registryCode(DeviceSN)}`,
    "ServerVersion=3.1.2",
    "ServerName=ADMS",
    "PushProtVer=3.1.2",
    "ErrorDelay=30",
    "RequestDelay=2",
    "TransTimes=00:00;14:00",
    "TransInterval=1",
    "TransTables=User Transaction",
    "Realtime=1",
    `SessionID=${registryCode(`sesion-${DeviceSN}`)}`,
    "TimeoutSec=10",
  ].join("\n");
}

// Trama rtlog: una línea por evento con pares clave=valor separados por tabulador
// time=2026-09-28 11:52:10	pin=1234	cardno=0	eventaddr=1	event=0	inoutstatus=0	verifytype=15 ...
function segmentarTramaRtlog(trama) {
  return String(trama)
    .split("\n")
    .filter((linea) => linea.trim() !== "")
    .map((linea) => {
      const campos = {};
      for (const par of linea.trim().split("\t")) {
        const i = par.indexOf("=");
        if (i > 0) campos[par.slice(0, i).trim()] = par.slice(i + 1).trim();
      }
      return {
        UserCode: parseInt(campos.pin, 10),
        timestamp: campos.time,
        event: parseInt(campos.event, 10),
        verifytype: parseInt(campos.verifytype, 10),
        inoutstatus: parseInt(campos.inoutstatus, 10),
      };
    });
}

// Comandos para dar de alta una persona en el equipo (PUSH acc).
// Los campos van separados por tabulador: se quitan tabuladores y saltos de línea de los valores.
// tarjeta, password y privilegio: al reenviar una persona importada del equipo se mandan los que
// tenía, para no borrarle la tarjeta, la contraseña ni el rol de administrador.
const valorCampo = (valor) => String(valor ?? "").replace(/[\t\r\n]+/g, " ").trim();
function comandoAltaUsuario(id, { pin, nombre, tarjeta = "", password = "", privilegio = 0 }) {
  return `C:${id}:DATA UPDATE user CardNo=${valorCampo(tarjeta)}\tPin=${pin}\tPassword=${valorCampo(password)}\tGroup=0\tStartTime=0\tEndTime=0\tName=${valorCampo(nombre)}\tPrivilege=${Number(privilegio) || 0}`;
}

// Autorización de acceso: sin ella el equipo reconoce la huella pero responde
// "Periodo de tiempo no válido". Franja horaria 1 = acceso 24 h (por defecto en los equipos);
// AuthorizeDoorId es una máscara de puertas (1 = puerta 1).
function comandoAutorizacion(id, { pin, franjaHoraria = 1, puertas = 1 }) {
  return `C:${id}:DATA UPDATE userauthorize Pin=${pin}\tAuthorizeTimezoneId=${franjaHoraria}\tAuthorizeDoorId=${puertas}`;
}

function comandoAltaHuella(id, { pin, dedo, plantilla }) {
  return `C:${id}:DATA UPDATE templatev10 Size=${Buffer.from(plantilla, "base64").length}\tPin=${pin}\tFingerID=${dedo}\tValid=1\tTemplate=${plantilla}\tEndTag=`;
}

// Borra del equipo la huella de un dedo (FingerID 0-9) de la persona
function comandoEliminarHuella(id, { pin, dedo }) {
  return `C:${id}:DATA DELETE templatev10 Pin=${pin}\tFingerID=${dedo}`;
}

// Borra a la persona del equipo: primero su autorización y todas sus huellas, al final el usuario
function comandosEliminarPersona(id, { pin }) {
  return [
    `C:${id}:DATA DELETE userauthorize Pin=${pin}`,
    `C:${id + 1}:DATA DELETE templatev10 Pin=${pin}`,
    `C:${id + 2}:DATA DELETE user Pin=${pin}`,
  ];
}

module.exports = {
  registryCode,
  comandoEliminarHuella,
  comandosEliminarPersona,
  configuracionAcc,
  segmentarTramaRtlog,
  comandoAltaUsuario,
  comandoAutorizacion,
  comandoAltaHuella,
};
