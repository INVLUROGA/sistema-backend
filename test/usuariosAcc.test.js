// Tests de la sincronización de usuarios de equipos de control de acceso (PUSH acc)
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// BD falsa: usuarios en memoria y comandos encolados
const usuariosBD = new Map();
const comandos = [];
const fakePool = {
  request() {
    const inputs = {};
    return {
      input(nombre, _tipo, valor) {
        inputs[nombre] = valor;
        return this;
      },
      async query(query) {
        if (/MERGE dbo\.zk_Users/.test(query)) {
          usuariosBD.set(inputs.UserCode, { ...inputs });
          return { rowsAffected: [1] };
        }
        if (/SELECT UserCode FROM dbo\.zk_Users/.test(query)) {
          const pins = Object.values(inputs);
          return { recordset: pins.filter((p) => usuariosBD.has(p)).map((UserCode) => ({ UserCode })) };
        }
        if (/INSERT INTO dbo\.zk_QueueCMD/.test(query)) {
          comandos.push({ ...inputs });
          return { rowsAffected: [1] };
        }
        if (/SELECT IsActive/.test(query)) return { recordset: [{ IsActive: true }] };
        return { rowsAffected: [1], recordset: [] };
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

const accUserService = require("../services/accUserService");
const querydataController = require("../controller/ZkTeco/iclock/querydataController");
const cdataController = require("../controller/ZkTeco/iclock/cdataController");

const TRAMA_USUARIOS =
  "user uid=1\tcardno=0\tpin=41235478\tpassword=\tgroup=1\tstarttime=0\tendtime=0\tname=Juan Perez\tprivilege=0\tdisable=0\tverify=0\n" +
  "user uid=2\tcardno=12345\tpin=76069670\tpassword=123\tgroup=1\tstarttime=0\tendtime=0\tname=Ana\tprivilege=14\tdisable=1\tverify=0\n";

function crearRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    type() {
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
  };
}

const silenciar = () => {
  const original = { log: console.log, warn: console.warn };
  console.log = console.warn = () => {};
  return () => Object.assign(console, original);
};

beforeEach(() => {
  usuariosBD.clear();
  comandos.length = 0;
  accUserService.limpiarSolicitudes();
});

test("segmentarTramaUsuarios extrae PIN, nombre, tarjeta, rol y estado", () => {
  const [u1, u2] = accUserService.segmentarTramaUsuarios(TRAMA_USUARIOS);
  assert.deepEqual(u1, { UserCode: 41235478, Name: "Juan Perez", Password: null, Card: null, IsActive: true, Role: 0 });
  assert.deepEqual(u2, { UserCode: 76069670, Name: "Ana", Password: 123, Card: "12345", IsActive: false, Role: 14 });
});

test("POST /iclock/querydata guarda los usuarios y responde user=<cantidad>", async () => {
  const restaurar = silenciar();
  const res = crearRes();
  await querydataController.fxpost(
    { query: { SN: "CRJP230860129", tablename: "user", count: "2" }, body: TRAMA_USUARIOS },
    res
  );
  restaurar();

  assert.equal(res.body, "user=2");
  assert.equal(usuariosBD.get(41235478).Name, "Juan Perez");
});

test("marcación de PIN desconocido pide los usuarios al equipo una sola vez cada 10 min", async () => {
  const restaurar = silenciar();
  const rtlog = "time=2026-09-28 12:00:00\tpin=41235478\tevent=0\tverifytype=1\n";
  const req = { query: { SN: "CRJP230860129", table: "rtlog" }, body: rtlog, headers: {}, socket: {} };

  await cdataController.fxpost(req, crearRes());
  await new Promise((r) => setImmediate(r));
  await cdataController.fxpost(req, crearRes());
  await new Promise((r) => setImmediate(r));
  restaurar();

  assert.equal(comandos.length, 1);
  assert.equal(comandos[0].DeviceSN, "CRJP230860129");
  assert.match(comandos[0].CMD, /^C:\d+:DATA QUERY tablename=user,fielddesc=\*,filter=\*$/);
});

test("marcación de PIN ya registrado no pide nada al equipo", async () => {
  usuariosBD.set(41235478, { Name: "Juan Perez" });
  const restaurar = silenciar();
  const pedido = await accUserService.verificarUsuariosDesconocidos("CRJP230860129", [41235478]);
  restaurar();

  assert.equal(pedido, false);
  assert.equal(comandos.length, 0);
});

test("usuario enrolado en el equipo (table=tabledata) se registra automáticamente", async () => {
  const restaurar = silenciar();
  const res = crearRes();
  await cdataController.fxpost(
    { query: { SN: "CRJP230860129", table: "tabledata", tablename: "user" }, body: TRAMA_USUARIOS, headers: {}, socket: {} },
    res
  );
  restaurar();

  assert.equal(res.body, "user=2");
  assert.equal(usuariosBD.size, 2);
});

test("listarPersonas devuelve DNI, nombre, dedos con huella y fecha de registro en Perú", async () => {
  const pool = await require("../database/connectionSQLserver").poolPromise;
  const requestOriginal = pool.request;
  let consulta = "";
  pool.request = () => ({
    async query(q) {
      consulta = q;
      return {
        recordset: [
          { UserCode: 123222240, Name: "alejandro", IsActive: true, CreationTime: new Date("2026-09-29T03:23:20Z"), Dedos: "2,6" },
          { UserCode: 44355840, Name: "JANETT", IsActive: false, CreationTime: null, Dedos: null },
        ],
      };
    },
  });
  try {
    const personas = await accUserService.listarPersonas();
    assert.match(consulta, /LEFT JOIN dbo\.zk_UserData64 h ON h\.UserCode = u\.UserCode AND h\.DataLabel = 'FP'/);
    assert.deepEqual(personas, [
      // 03:23 UTC del 29/09 = 22:23 del 28/09 en Perú
      { pin: 123222240, nombre: "alejandro", activo: true, dedos: [2, 6], huellas: 2, registrado: "2026-09-28" },
      { pin: 44355840, nombre: "JANETT", activo: false, dedos: [], huellas: 0, registrado: null },
    ]);
  } finally {
    pool.request = requestOriginal;
  }
});
