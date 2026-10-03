// Tests de GET /api/eventos-asistencia (marcaciones para la página GestionEventosAsistencia)
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

let ultimaConsulta = null;
const fakePool = {
  request() {
    const inputs = {};
    return {
      input(nombre, _tipo, valor) {
        inputs[nombre] = valor;
        return this;
      },
      async query(query) {
        ultimaConsulta = { query, inputs };
        return {
          recordset: [
            {
              Id: 7,
              UserCode: 41235478,
              Name: "Juan Perez",
              Dni: "41235478",
              Device: "CRJP230860129",
              PunchTime: new Date("2026-09-28T16:46:13Z"),
              UploadTime: new Date("2026-09-28T16:53:44Z"),
            },
          ],
        };
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

const { obtenerEventosAsistencia } = require("../controller/eventosAsistencia.controller");

function crearRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

beforeEach(() => {
  ultimaConsulta = null;
});

test("devuelve las marcaciones con fecha y hora de Perú", async () => {
  const res = crearRes();
  await obtenerEventosAsistencia({ query: { desde: "2026-09-28", hasta: "2026-09-28" } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.eventos[0], {
    id: 7,
    pin: 41235478,
    dni: "41235478",
    nombre: "Juan Perez",
    huellero: "CRJP230860129",
    fecha: "2026-09-28",
    hora: "11:46:13",
    marcacion: new Date("2026-09-28T16:46:13Z"),
    recibida: "2026-09-28 11:53:44",
  });
});

test("el rango cubre los días completos en hora de Perú", async () => {
  await obtenerEventosAsistencia({ query: { desde: "2026-09-01", hasta: "2026-09-28" } }, crearRes());

  assert.equal(ultimaConsulta.inputs.inicio.toISOString(), "2026-09-01T05:00:00.000Z");
  assert.equal(ultimaConsulta.inputs.fin.toISOString(), "2026-09-29T05:00:00.000Z");
});

test("sin fechas usa el día de hoy", async () => {
  const res = crearRes();
  await obtenerEventosAsistencia({ query: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.match(res.body.desde, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(res.body.desde, res.body.hasta);
});

test("rechaza fechas inválidas, rangos invertidos y rangos muy largos", async () => {
  for (const query of [
    { desde: "28/09/2026" },
    { desde: "2026-09-28", hasta: "2026-09-01" },
    { desde: "2026-01-01", hasta: "2026-12-31" },
  ]) {
    const res = crearRes();
    await obtenerEventosAsistencia({ query }, res);
    assert.equal(res.statusCode, 400, JSON.stringify(query));
  }
  assert.equal(ultimaConsulta, null);
});
