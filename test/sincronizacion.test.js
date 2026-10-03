// Tests del estado de sincronización de GET /api/eventos-asistencia/personas:
// cola (pendiente) + historial de resultados del huellero (esperando / confirmado / error).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// BD falsa: personas, cola de comandos, historial de resultados y huelleros
const PERSONAS = [
  { UserCode: 123222240, Name: "alejandro", IsActive: true, CreationTime: null, Dedos: "2" },
  { UserCode: 337788, Name: "CARLOS", IsActive: true, CreationTime: null, Dedos: "6" },
  { UserCode: 44000020, Name: "ANA", IsActive: true, CreationTime: null, Dedos: "4,6" },
  { UserCode: 55555555, Name: "LUIS", IsActive: true, CreationTime: null, Dedos: "1" },
  { UserCode: 66666666, Name: "MARIA", IsActive: true, CreationTime: null, Dedos: "3" },
  { UserCode: 77777777, Name: "PEDRO", IsActive: true, CreationTime: null, Dedos: "0" },
  { UserCode: 88888888, Name: "ROSA", IsActive: true, CreationTime: null, Dedos: "5" },
];
const COLA = [
  { DeviceSN: "CRJP230860129", CMD: "C:10:DATA UPDATE user CardNo=\tPin=123222240\tPassword=\tName=alejandro" },
  { DeviceSN: "CRJP230860129", CMD: "C:11:DATA UPDATE templatev10 Size=1132\tPin=123222240\tFingerID=2\tValid=1\tTemplate=SSST" },
  { DeviceSN: "CRJP230860136", CMD: "C:10:DATA UPDATE user CardNo=\tPin=123222240\tPassword=\tName=alejandro" },
  { DeviceSN: "CRJP230860136", CMD: "C:20:DATA DELETE user Pin=99909091" }, // persona ya eliminada de la BD
  { DeviceSN: "CRJP230860136", CMD: "C:104:DATA UPDATE FINGERTMP PIN=76069670\tFID=2" }, // formato de asistencia, sin persona
  { DeviceSN: "CRJP230860129", CMD: "C:30:DATA QUERY tablename=user,fielddesc=*,filter=*" }, // no es de una persona
  { DeviceSN: "CRJP230860129", CMD: "C:40:DATA DELETE templatev10 Pin=88888888\tFingerID=1" }, // huella borrándose
];
// Último resultado de cada operación (zk_CommandLog)
const RESULTADOS = [
  { DeviceSN: "CRJP230860129", Pin: 337788, Dedo: 6, Operacion: "envío de huella", Resultado: 0, Segundos: 30 },
  { DeviceSN: "CRJP230860129", Pin: 44000020, Dedo: null, Operacion: "alta del usuario", Resultado: 0, Segundos: 30 },
  { DeviceSN: "CRJP230860129", Pin: 44000020, Dedo: 4, Operacion: "envío de huella", Resultado: -1002, Segundos: 30 },
  { DeviceSN: "CRJP230860129", Pin: 55555555, Dedo: 1, Operacion: "envío de huella", Resultado: null, Segundos: 5 },
  { DeviceSN: "CRJP230860129", Pin: 66666666, Dedo: 3, Operacion: "envío de huella", Resultado: null, Segundos: 900 },
  // Borrados registrados al pedirlos (EntregadoEn null = aún sin marca de entrega)
  { DeviceSN: "CRJP230860129", Pin: 88888888, Dedo: 1, Operacion: "borrado de huella", EntregadoEn: null, Resultado: null, SegundosDesdePedido: 3 },
  { DeviceSN: "CRJP230860129", Pin: 44000020, Dedo: 9, Operacion: "borrado de huella", EntregadoEn: null, Resultado: null, SegundosDesdePedido: 60 },
  { DeviceSN: "CRJP230860129", Pin: 44000020, Dedo: 8, Operacion: "borrado de huella", Resultado: 0, Segundos: 30, SegundosDesdePedido: 90000 }, // más de 24 h
  { DeviceSN: "CRJP230860129", Pin: 12121212, Dedo: null, Operacion: "borrado del usuario", Nombre: "JUAN", Resultado: 0, Segundos: 20, SegundosDesdePedido: 25 },
  { DeviceSN: "CRJP230860129", Pin: 13131313, Dedo: null, Operacion: "borrado del usuario", Nombre: "SOFIA", EntregadoEn: null, Resultado: null, SegundosDesdePedido: 600 },
  { DeviceSN: "CRJP230860129", Pin: 14141414, Dedo: null, Operacion: "borrado del usuario", Nombre: "VIEJO", Resultado: 0, Segundos: 20, SegundosDesdePedido: 90000 },
];
let consultaCola = "";
let consultaHistorial = "";
const fakePool = {
  request() {
    return {
      input() {
        return this;
      },
      async query(query) {
        if (/FROM dbo\.zk_Users u/.test(query)) return { recordset: PERSONAS };
        if (/FROM dbo\.zk_QueueCMD/.test(query)) {
          consultaCola = query;
          return { recordset: COLA };
        }
        if (/FROM dbo\.zk_CommandLog/.test(query)) {
          consultaHistorial = query;
          return { recordset: RESULTADOS };
        }
        if (/FROM dbo\.zk_Devices/.test(query)) {
          return {
            recordset: [
              { DeviceSN: "CRJP230860129", IsActive: true, ultima_conexion: new Date(), ultima_ip: "1.1.1.1" },
              { DeviceSN: "CRJP230860136", IsActive: true, ultima_conexion: null, ultima_ip: null },
            ],
          };
        }
        throw new Error(`Consulta inesperada: ${query}`);
      },
    };
  },
};
const rutaConexion = path.resolve(__dirname, "../database/connectionSQLserver.js");
require.cache[rutaConexion] = {
  id: rutaConexion,
  filename: rutaConexion,
  loaded: true,
  exports: { poolPromise: Promise.resolve(fakePool), sql: require("mssql") },
};

const { describirComando } = require("../services/commandService");
const { obtenerPersonas } = require("../controller/eventosAsistencia.controller");

test("describirComando reconoce el ID, la persona, el dedo y la operación de cada comando", () => {
  assert.deepEqual(describirComando("C:1:DATA UPDATE user CardNo=\tPin=41235478\tName=Juan"), {
    cmdId: "1",
    pin: 41235478,
    dedo: null,
    operacion: "alta del usuario",
    esBorrado: false,
  });
  const huella = describirComando("C:2:DATA UPDATE templatev10 Size=9\tPin=1\tFingerID=6\tValid=1\tTemplate=AAAA");
  assert.deepEqual(
    { operacion: huella.operacion, dedo: huella.dedo, cmdId: huella.cmdId },
    { operacion: "envío de huella", dedo: 6, cmdId: "2" }
  );
  assert.equal(describirComando("C:3:DATA UPDATE userauthorize Pin=1\tAuthorizeTimezoneId=1").operacion, "autorización de acceso");
  assert.deepEqual(describirComando("C:4:DATA DELETE templatev10 Pin=7\tFingerID=2"), {
    cmdId: "4",
    pin: 7,
    dedo: 2,
    operacion: "borrado de huella",
    esBorrado: true,
  });
  assert.equal(describirComando("C:5:DATA DELETE user Pin=7").operacion, "borrado del usuario");
  // Formato antiguo de asistencia (el dedo va en FID=)
  assert.equal(describirComando("C:103:DATA UPDATE USERINFO PIN=76069670\tName=JairTEST4").pin, 76069670);
  assert.equal(describirComando("C:104:DATA UPDATE FINGERTMP PIN=76069670\tFID=2\tSize=1").dedo, 2);
  // Comandos que no son de una persona
  assert.equal(describirComando("C:6:DATA QUERY tablename=user,fielddesc=*,filter=*"), null);
});

test("cada persona indica si está pendiente, esperando confirmación, confirmada o con error", async () => {
  let body;
  await obtenerPersonas({}, { status: () => ({ json: (b) => (body = b) }) });
  const sinc = (pin) => body.personas.find((p) => p.pin === pin).sincronizacion;

  // La cola se lee sin traer las plantillas completas
  assert.match(consultaCola, /LEFT\(CMD, 300\)/);

  // En cola: pendiente, con sus huelleros, operaciones y el dedo que falta enviar
  assert.deepEqual(sinc(123222240), {
    estado: "pendiente",
    pendiente: true,
    huelleros: ["CRJP230860129", "CRJP230860136"],
    operaciones: ["alta del usuario", "envío de huella"],
    esperando: [],
    errores: [],
    dedosPendientes: [2],
    dedosConError: [],
  });
  // El huellero confirmó (Return=0)
  assert.equal(sinc(337788).estado, "confirmado");
  // El huellero rechazó la huella del dedo 4 (Return negativo)
  assert.equal(sinc(44000020).estado, "error");
  assert.deepEqual(sinc(44000020).errores, [
    { DeviceSN: "CRJP230860129", operacion: "envío de huella", dedo: 4, codigo: -1002 },
  ]);
  assert.deepEqual(sinc(44000020).dedosConError, [4]);
  // Entregado hace 5 s, aún sin respuesta
  assert.equal(sinc(55555555).estado, "esperando");
  assert.deepEqual(sinc(55555555).esperando, [{ DeviceSN: "CRJP230860129", operacion: "envío de huella" }]);
  // Entregado hace 15 min y el equipo nunca respondió
  assert.equal(sinc(66666666).estado, "sin_confirmar");
  // Sin cola ni historial (ej. importada del huellero)
  assert.equal(sinc(77777777).estado, "sincronizado");

  // El historial solo considera el último resultado de cada operación, de los últimos 30 días
  assert.match(consultaHistorial, /PARTITION BY Pin, DeviceSN, ISNULL\(Dedo, -1\), Operacion ORDER BY Id DESC/);
  assert.match(consultaHistorial, /DATEADD\(day, -30, SYSUTCDATETIME\(\)\)/);

  // Borrados de personas ya eliminadas que aún no llegaron al huellero
  assert.deepEqual(body.borradosPendientes, [
    { pin: 99909091, huelleros: ["CRJP230860136"], operaciones: ["borrado del usuario"] },
  ]);

  // Huellas eliminadas en las últimas 24 h, con el estado del borrado en el huellero
  const eliminadas = (pin) => body.personas.find((p) => p.pin === pin).huellasEliminadas;
  assert.deepEqual(eliminadas(88888888), [{ dedo: 1, estado: "pendiente" }]); // aún en cola
  // Ya no está en cola (lo recogió un servidor sin registro de entregas) -> sincronizado;
  // el dedo 8 se borró hace más de 24 h y ya no se muestra
  assert.deepEqual(eliminadas(44000020), [{ dedo: 9, estado: "sincronizado" }]);
  assert.deepEqual(eliminadas(337788), []);

  // Personas eliminadas recientemente, con el estado del borrado
  const recientes = Object.fromEntries(body.eliminadasRecientes.map((e) => [e.pin, e]));
  assert.deepEqual(Object.keys(recientes).map(Number).sort(), [12121212, 13131313, 99909091]);
  assert.equal(recientes[99909091].sincronizacion.estado, "pendiente"); // borrado aún en cola
  assert.deepEqual({ nombre: recientes[12121212].nombre, estado: recientes[12121212].sincronizacion.estado }, { nombre: "JUAN", estado: "confirmado" });
  assert.deepEqual({ nombre: recientes[13131313].nombre, estado: recientes[13131313].sincronizacion.estado }, { nombre: "SOFIA", estado: "sincronizado" });

  // Estado de los huelleros para mostrar si están en línea
  assert.deepEqual(body.huelleros, [
    { DeviceSN: "CRJP230860129", estado: "online" },
    { DeviceSN: "CRJP230860136", estado: "offline" },
  ]);
});
