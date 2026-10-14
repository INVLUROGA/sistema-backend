// Tests de GET /api/eventos-asistencia/cliente/:uid (pestaña Asistencias del perfil del cliente)
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

let consultas = [];
let clientes = [];
let marcaciones = [];
const fakePool = {
  request() {
    const inputs = {};
    return {
      input(nombre, _tipo, valor) {
        inputs[nombre] = valor;
        return this;
      },
      async query(query) {
        consultas.push({ query, inputs });
        return { recordset: query.includes("dbo.tb_clientes") ? clientes : marcaciones };
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

const { obtenerAsistenciasCliente } = require("../controller/eventosAsistencia.controller");

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
  consultas = [];
  clientes = [{ Dni: "41235478" }];
  marcaciones = [
    {
      Id: 7,
      UserCode: 41235478,
      Name: "Juan Perez",
      Dni: "41235478",
      LabelEstado: "activo para FS45",
      Device: "CRJP230860129",
      PunchTime: new Date("2026-09-28T16:46:13Z"),
      UploadTime: new Date("2026-09-28T16:53:44Z"),
    },
  ];
});

test("devuelve las marcaciones del cliente buscadas por su DNI", async () => {
  const res = crearRes();
  await obtenerAsistenciasCliente({ params: { uid: "abc-123" } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.dni, "41235478");
  assert.equal(consultas[0].inputs.uid, "abc-123");
  assert.equal(consultas[1].inputs.dni, "41235478");
  assert.deepEqual(res.body.eventos[0], {
    id: 7,
    pin: 41235478,
    dni: "41235478",
    labelEstado: "activo para FS45",
    labelColor: "#22c55e",
    nombre: "Juan Perez",
    huellero: "CRJP230860129",
    fecha: "2026-09-28",
    hora: "11:46:13",
    marcacion: new Date("2026-09-28T16:46:13Z"),
    recibida: "2026-09-28 11:53:44",
  });
});

test("404 si el cliente no existe", async () => {
  clientes = [];
  const res = crearRes();
  await obtenerAsistenciasCliente({ params: { uid: "no-existe" } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(consultas.length, 1);
});

test("cliente sin DNI: lista vacía sin consultar marcaciones", async () => {
  clientes = [{ Dni: null }];
  const res = crearRes();
  await obtenerAsistenciasCliente({ params: { uid: "abc-123" } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true, dni: null, eventos: [] });
  assert.equal(consultas.length, 1);
});
