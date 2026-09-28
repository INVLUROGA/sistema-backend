// Tests del protocolo PUSH de control de acceso (DeviceType=acc, ej. SpeedFace-V3L)
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// BD falsa: dispositivos activos y marcaciones guardadas en memoria
const dispositivosActivos = new Set(["CRJP230860129"]);
const guardadas = [];
const fakePool = {
  request() {
    const inputs = {};
    return {
      input(nombre, _tipo, valor) {
        inputs[nombre] = valor;
        return this;
      },
      async query(query) {
        if (/SELECT IsActive/.test(query)) {
          return { recordset: dispositivosActivos.has(inputs.DeviceSN) ? [{ IsActive: true }] : [] };
        }
        if (/zk_Transactions/.test(query)) guardadas.push({ ...inputs });
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

const accPushService = require("../services/accPushService");
const cdataController = require("../controller/ZkTeco/iclock/cdataController");
const registryController = require("../controller/ZkTeco/iclock/registryController");

// Trama real enviada por el SpeedFace-V3L
const RTLOG =
  "time=2026-09-28 11:40:45\tpin=41235478\tcardno=0\teventaddr=1\tevent=0\tinoutstatus=0\tverifytype=1\tindex=13355\tsitecode=0\tlinkid=0\tmaskflag=0\ttemperature=0\tconvtemperature=0\n" +
  "time=2026-09-28 11:45:56\tpin=0\tcardno=0\teventaddr=1\tevent=27\tinoutstatus=1\tverifytype=1\tindex=13357\tsitecode=0\tlinkid=0\tmaskflag=0\ttemperature=0\tconvtemperature=0\n";

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

// Silencia la consola de los controladores durante cada test
let restaurarConsola;
beforeEach((t) => {
  guardadas.length = 0;
  const original = { log: console.log, warn: console.warn };
  console.log = console.warn = () => {};
  restaurarConsola = () => Object.assign(console, original);
  t.after?.(() => restaurarConsola());
});

const req = (query, body) => ({ query, body, headers: {}, socket: {} });

test("segmentarTramaRtlog extrae pin, hora y evento", () => {
  const [e1, e2] = accPushService.segmentarTramaRtlog(RTLOG);
  assert.deepEqual(e1, { UserCode: 41235478, timestamp: "2026-09-28 11:40:45", event: 0, verifytype: 1, inoutstatus: 0 });
  assert.equal(e2.UserCode, 0);
  assert.equal(e2.event, 27);
});

test("POST cdata table=rtlog guarda solo eventos con usuario y responde OK", async () => {
  const res = crearRes();
  await cdataController.fxpost(req({ SN: "CRJP230860129", table: "rtlog" }, RTLOG), res);
  restaurarConsola();

  assert.equal(res.body, "OK");
  assert.equal(guardadas.length, 1);
  assert.equal(guardadas[0].UserCode, 41235478);
  assert.equal(guardadas[0].PunchTime, "2026-09-28T16:40:45.000Z");
});

test("GET cdata DeviceType=acc responde la configuración de control de acceso", async () => {
  const res = crearRes();
  await cdataController.fxget(req({ SN: "CRJP230860129", options: "all", DeviceType: "acc" }), res);
  restaurarConsola();

  assert.match(res.body, /^registry=ok\n/);
  assert.match(res.body, /RegistryCode=[0-9a-f]{10}/);
  assert.match(res.body, /Realtime=1/);
});

test("GET cdata sin DeviceType mantiene la respuesta de asistencia", async () => {
  const res = crearRes();
  await cdataController.fxget(req({ SN: "CRJP230860129", options: "all" }), res);
  restaurarConsola();

  assert.match(res.body, /^GET OPTION FROM: CRJP230860129/);
});

test("POST registry y push responden al SN activo y rechazan al desconocido", async () => {
  const code = accPushService.registryCode("CRJP230860129");

  const registro = crearRes();
  await registryController.fxpost(req({ SN: "CRJP230860129" }, "DeviceType=acc"), registro);
  assert.equal(registro.body, `RegistryCode=${code}`);

  const push = crearRes();
  await registryController.fxpush(req({ SN: "CRJP230860129" }, ""), push);
  assert.match(push.body, new RegExp(`RegistryCode=${code}`));

  const desconocido = crearRes();
  await registryController.fxpost(req({ SN: "NOEXISTE" }, ""), desconocido);
  restaurarConsola();
  assert.equal(desconocido.statusCode, 400);
});
