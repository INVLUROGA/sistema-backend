// Tests del estado "pendiente de sincronizar" de GET /api/eventos-asistencia/personas
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// BD falsa: personas, cola de comandos y huelleros
const PERSONAS = [
  { UserCode: 123222240, Name: "alejandro", IsActive: true, CreationTime: null, Dedos: "2" },
  { UserCode: 337788, Name: "CARLOS", IsActive: true, CreationTime: null, Dedos: "6" },
];
const COLA = [
  { DeviceSN: "CRJP230860129", CMD: "C:10:DATA UPDATE user CardNo=\tPin=123222240\tPassword=\tName=alejandro" },
  { DeviceSN: "CRJP230860129", CMD: "C:11:DATA UPDATE templatev10 Size=1132\tPin=123222240\tFingerID=2\tValid=1\tTemplate=SSST" },
  { DeviceSN: "CRJP230860136", CMD: "C:10:DATA UPDATE user CardNo=\tPin=123222240\tPassword=\tName=alejandro" },
  { DeviceSN: "CRJP230860136", CMD: "C:20:DATA DELETE user Pin=99909091" }, // persona ya eliminada de la BD
  { DeviceSN: "CRJP230860136", CMD: "C:104:DATA UPDATE FINGERTMP PIN=76069670\tFID=2" }, // formato de asistencia, sin persona
  { DeviceSN: "CRJP230860129", CMD: "C:30:DATA QUERY tablename=user,fielddesc=*,filter=*" }, // no es de una persona
];
let consultaCola = "";
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

test("describirComando reconoce la persona y la operación de cada comando", () => {
  assert.deepEqual(describirComando("C:1:DATA UPDATE user CardNo=\tPin=41235478\tName=Juan"), {
    pin: 41235478,
    operacion: "alta del usuario",
    esBorrado: false,
  });
  assert.equal(describirComando("C:2:DATA UPDATE templatev10 Size=9\tPin=1\tFingerID=6").operacion, "envío de huella");
  assert.equal(describirComando("C:3:DATA UPDATE userauthorize Pin=1\tAuthorizeTimezoneId=1").operacion, "autorización de acceso");
  assert.deepEqual(describirComando("C:4:DATA DELETE templatev10 Pin=7\tFingerID=2"), {
    pin: 7,
    operacion: "borrado de huella",
    esBorrado: true,
  });
  assert.equal(describirComando("C:5:DATA DELETE user Pin=7").operacion, "borrado del usuario");
  // Formato antiguo de asistencia
  assert.equal(describirComando("C:103:DATA UPDATE USERINFO PIN=76069670\tName=JairTEST4").pin, 76069670);
  // Comandos que no son de una persona
  assert.equal(describirComando("C:6:DATA QUERY tablename=user,fielddesc=*,filter=*"), null);
});

test("cada persona indica si está sincronizada o pendiente, y en qué huelleros", async () => {
  let body;
  await obtenerPersonas({}, { status: () => ({ json: (b) => (body = b) }) });

  // La cola se lee sin traer las plantillas completas
  assert.match(consultaCola, /LEFT\(CMD, 300\)/);

  const alejandro = body.personas.find((p) => p.pin === 123222240);
  assert.deepEqual(alejandro.sincronizacion, {
    pendiente: true,
    huelleros: ["CRJP230860129", "CRJP230860136"],
    operaciones: ["alta del usuario", "envío de huella"],
  });
  const carlos = body.personas.find((p) => p.pin === 337788);
  assert.deepEqual(carlos.sincronizacion, { pendiente: false, huelleros: [], operaciones: [] });

  // Borrados de personas ya eliminadas que aún no llegaron al huellero
  assert.deepEqual(body.borradosPendientes, [
    { pin: 99909091, huelleros: ["CRJP230860136"], operaciones: ["borrado del usuario"] },
  ]);

  // Estado de los huelleros para mostrar si están en línea
  assert.deepEqual(body.huelleros, [
    { DeviceSN: "CRJP230860129", estado: "online" },
    { DeviceSN: "CRJP230860136", estado: "offline" },
  ]);
});
