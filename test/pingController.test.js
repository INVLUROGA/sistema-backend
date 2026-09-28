// Tests de GET /iclock/ping y del cálculo de estado de dispositivos
// Ejecutar con: npm test
const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// Reemplaza la conexión real a SQL Server por una BD falsa (antes de cargar los servicios)
const fakeDb = { rowsAffected: 1, falla: false, consultas: [] };
const fakePool = {
  request() {
    const inputs = {};
    return {
      input(nombre, _tipo, valor) {
        inputs[nombre] = valor;
        return this;
      },
      async query(query) {
        fakeDb.consultas.push({ query, inputs });
        if (fakeDb.falla) throw new Error("BD caída");
        return { rowsAffected: [fakeDb.rowsAffected], recordset: [] };
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

const pingController = require("../controller/ZkTeco/iclock/pingController");
const deviceService = require("../services/deviceService");
const heartbeatCache = require("../services/heartbeatCache");
const heartbeatService = require("../services/heartbeatService");
const getrequestController = require("../controller/ZkTeco/iclock/getrequestController");
const cdataController = require("../controller/ZkTeco/iclock/cdataController");
const commandService = require("../services/commandService");

// Espera a que terminen las escrituras en segundo plano
const esperarSegundoPlano = () => new Promise((resolve) => setImmediate(resolve));
const consultasLatido = () =>
  fakeDb.consultas.filter((c) => /UPDATE dbo\.zk_Devices/.test(c.query));

function crearReq(query = {}, headers = {}) {
  return { query, headers, socket: { remoteAddress: "::ffff:127.0.0.1" } };
}

function crearRes() {
  return {
    statusCode: 200,
    contentType: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    type(t) {
      this.contentType = t;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
  };
}

function capturarConsola(metodo) {
  const original = console[metodo];
  const llamadas = [];
  console[metodo] = (...args) => llamadas.push(args.join(" "));
  return { llamadas, restaurar: () => (console[metodo] = original) };
}

function assertRespuestaOK(res) {
  assert.equal(res.statusCode, 200);
  assert.equal(res.contentType, "text/plain");
  assert.equal(res.body, "OK");
}

describe("GET /iclock/ping", () => {
  let warn;
  let error;

  beforeEach(() => {
    heartbeatCache.limpiar();
    fakeDb.rowsAffected = 1;
    fakeDb.falla = false;
    fakeDb.consultas = [];
    warn = capturarConsola("warn");
    error = capturarConsola("error");
  });

  afterEach(() => {
    warn.restaurar();
    error.restaurar();
  });

  test("SN conocido: responde OK y actualiza ultima_conexion e IP", async () => {
    const res = crearRes();
    await pingController.fxget(
      crearReq({ SN: "CKJF123456", otro: "x" }, { "x-forwarded-for": "190.12.34.56:51234, 10.0.0.1" }),
      res
    );

    assertRespuestaOK(res);
    assert.equal(fakeDb.consultas.length, 1);
    assert.match(fakeDb.consultas[0].query, /UPDATE dbo\.zk_Devices/);
    assert.match(fakeDb.consultas[0].query, /SYSUTCDATETIME\(\)/);
    assert.deepEqual(fakeDb.consultas[0].inputs, { DeviceSN: "CKJF123456", ip: "190.12.34.56" });
    assert.equal(warn.llamadas.length, 0);
  });

  test("SN desconocido: responde OK, no lo registra y deja advertencia con SN e IP", async () => {
    fakeDb.rowsAffected = 0;
    const res = crearRes();
    await pingController.fxget(crearReq({ SN: "DESCONOCIDO1" }), res);

    assertRespuestaOK(res);
    assert.equal(fakeDb.consultas.length, 1);
    assert.doesNotMatch(fakeDb.consultas[0].query, /INSERT/i);
    assert.equal(warn.llamadas.length, 1);
    assert.match(warn.llamadas[0], /DESCONOCIDO1/);
    assert.match(warn.llamadas[0], /127\.0\.0\.1/);
  });

  test("SN más largo que la columna: se trata como desconocido sin consultar la BD", async () => {
    const res = crearRes();
    await pingController.fxget(crearReq({ SN: "X".repeat(21) }), res);

    assertRespuestaOK(res);
    assert.equal(fakeDb.consultas.length, 0);
    assert.equal(warn.llamadas.length, 1);
  });

  test("sin SN: responde OK y no toca la BD", async () => {
    for (const query of [{}, { SN: "" }, { SN: ["A", "B"] }]) {
      const res = crearRes();
      await pingController.fxget(crearReq(query), res);
      assertRespuestaOK(res);
    }
    assert.equal(fakeDb.consultas.length, 0);
  });

  test("fallo de BD: registra el error, responde OK y permite reintentar", async () => {
    fakeDb.falla = true;
    const res = crearRes();
    await pingController.fxget(crearReq({ SN: "CKJF123456" }), res);

    assertRespuestaOK(res);
    assert.equal(error.llamadas.length, 1);
    assert.match(error.llamadas[0], /CKJF123456/);
    // Tras un fallo no se espera 30 s: el siguiente ping vuelve a intentar
    assert.equal(heartbeatCache.debeEscribir("CKJF123456"), true);
  });

  test("control de 30 s: no escribe de nuevo antes de 30 s, sí después", async (t) => {
    t.mock.timers.enable({ apis: ["Date"], now: 1_000_000 });

    await pingController.fxget(crearReq({ SN: "CKJF123456" }), crearRes());
    assert.equal(fakeDb.consultas.length, 1);

    t.mock.timers.tick(29_999);
    const res = crearRes();
    await pingController.fxget(crearReq({ SN: "CKJF123456" }), res);
    assertRespuestaOK(res);
    assert.equal(fakeDb.consultas.length, 1);

    // Otro SN no se ve afectado por la caché del primero
    await pingController.fxget(crearReq({ SN: "OTRO999" }), crearRes());
    assert.equal(fakeDb.consultas.length, 2);

    t.mock.timers.tick(1);
    await pingController.fxget(crearReq({ SN: "CKJF123456" }), crearRes());
    assert.equal(fakeDb.consultas.length, 3);
  });
});

describe("latido desde /iclock/getrequest y /iclock/cdata", () => {
  let log;
  let warn;
  const getRecentOriginal = commandService.getRecentCommandByDeviceSN;

  beforeEach(() => {
    heartbeatCache.limpiar();
    fakeDb.rowsAffected = 1;
    fakeDb.falla = false;
    fakeDb.consultas = [];
    log = capturarConsola("log");
    warn = capturarConsola("warn");
    commandService.getRecentCommandByDeviceSN = async () => null;
  });

  afterEach(() => {
    log.restaurar();
    warn.restaurar();
    commandService.getRecentCommandByDeviceSN = getRecentOriginal;
  });

  test("getrequest registra el latido y su respuesta no cambia", async () => {
    const res = crearRes();
    await getrequestController.fxget(crearReq({ SN: "CKJF123456" }), res);
    await esperarSegundoPlano();

    assert.equal(res.body, "OK");
    assert.equal(consultasLatido().length, 1);
    assert.equal(consultasLatido()[0].inputs.DeviceSN, "CKJF123456");
  });

  test("getrequest sin SN sigue respondiendo 400 y no registra latido", async () => {
    const res = crearRes();
    await getrequestController.fxget(crearReq({}), res);
    await esperarSegundoPlano();

    assert.equal(res.statusCode, 400);
    assert.equal(consultasLatido().length, 0);
  });

  test("cdata registra el latido y comparte el control de 30 s con ping y getrequest", async () => {
    await cdataController.fxget(crearReq({ SN: "CKJF123456" }), crearRes());
    await esperarSegundoPlano();
    await getrequestController.fxget(crearReq({ SN: "CKJF123456" }), crearRes());
    await pingController.fxget(crearReq({ SN: "CKJF123456" }), crearRes());
    await esperarSegundoPlano();

    assert.equal(consultasLatido().length, 1);
  });

  test("un fallo de BD en el latido no altera la respuesta de getrequest", async () => {
    const error = capturarConsola("error");
    fakeDb.falla = true;
    const res = crearRes();
    await getrequestController.fxget(crearReq({ SN: "CKJF123456" }), res);
    await esperarSegundoPlano();
    error.restaurar();

    assert.equal(res.body, "OK");
    assert.equal(error.llamadas.length, 1);
  });
});

describe("obtenerIp", () => {
  const ip = (headers, remoteAddress) =>
    heartbeatService.obtenerIp({ headers, socket: { remoteAddress } });

  test("usa el primer valor de X-Forwarded-For y quita el puerto", () => {
    assert.equal(ip({ "x-forwarded-for": "200.1.2.3:4455, 10.0.0.2" }), "200.1.2.3");
    assert.equal(ip({ "x-forwarded-for": "[2001:db8::1]:4455" }), "2001:db8::1");
  });

  test("sin proxy usa la IP del socket", () => {
    assert.equal(ip({}, "::ffff:192.168.1.20"), "192.168.1.20");
    assert.equal(ip({}, undefined), null);
  });
});

describe("deviceService.calcularEstado", () => {
  const ahora = new Date("2026-09-28T12:00:00Z");

  test("online dentro del umbral, offline fuera de él o sin conexión", () => {
    assert.equal(deviceService.calcularEstado(new Date("2026-09-28T11:57:00Z"), ahora, 3), "online");
    assert.equal(deviceService.calcularEstado(new Date("2026-09-28T11:56:59Z"), ahora, 3), "offline");
    assert.equal(deviceService.calcularEstado(null, ahora, 3), "offline");
  });

  test("el umbral es configurable con ZK_OFFLINE_MINUTES (por defecto 3)", () => {
    const anterior = process.env.ZK_OFFLINE_MINUTES;
    delete process.env.ZK_OFFLINE_MINUTES;
    assert.equal(deviceService.obtenerMinutosOffline(), 3);
    process.env.ZK_OFFLINE_MINUTES = "10";
    assert.equal(deviceService.obtenerMinutosOffline(), 10);
    assert.equal(deviceService.calcularEstado(new Date("2026-09-28T11:51:00Z"), ahora), "online");
    if (anterior === undefined) delete process.env.ZK_OFFLINE_MINUTES;
    else process.env.ZK_OFFLINE_MINUTES = anterior;
  });
});
