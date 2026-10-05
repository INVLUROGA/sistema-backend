// Tests de PUT /api/eventos-asistencia/personas/:pin/estado (botón Activo / Inactivo)
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

let usuarios, cola, fallarEncolado, ultimaTransaccion;
const DISPOSITIVOS = ["CRJP230860129", "CRJP230860136"];

class FakeTransaction {
  constructor() {
    this.pendientes = [];
    this.estado = "nueva";
  }
  async begin() {
    this.estado = "abierta";
  }
  async commit() {
    for (const aplicar of this.pendientes) aplicar();
    this.estado = "confirmada";
  }
  async rollback() {
    this.estado = "deshecha";
  }
}
class FakeRequest {
  constructor(transaccion) {
    this.transaccion = transaccion;
    ultimaTransaccion = transaccion;
    this.inputs = {};
  }
  input(nombre, _tipo, valor) {
    this.inputs[nombre] = valor;
    return this;
  }
  async query(query) {
    const { UserCode, IsActive, CMD } = this.inputs;
    if (/SELECT RTRIM\(Name\) AS Name, IsActive FROM dbo\.zk_Users/.test(query)) {
      const u = usuarios.get(UserCode);
      return { recordset: u ? [u] : [] };
    }
    if (/UPDATE dbo\.zk_Users/.test(query)) {
      this.transaccion.pendientes.push(() => (usuarios.get(UserCode).IsActive = IsActive));
      return { rowsAffected: [1] };
    }
    if (/INSERT INTO dbo\.zk_QueueCMD/.test(query)) {
      if (fallarEncolado) throw new Error("BD caída");
      assert.doesNotMatch(query, /Pin=/);
      this.transaccion.pendientes.push(() => cola.push(...DISPOSITIVOS.map((DeviceSN) => ({ DeviceSN, CMD }))));
      return { recordset: DISPOSITIVOS.map((DeviceSN) => ({ DeviceSN })) };
    }
    throw new Error(`Consulta inesperada: ${query}`);
  }
}
const mssql = require("mssql");
const sqlFalso = Object.assign(Object.create(mssql), { Transaction: FakeTransaction, Request: FakeRequest });
const rutaConexion = path.resolve(__dirname, "../database/connectionSQLserver.js");
require.cache[rutaConexion] = {
  id: rutaConexion,
  filename: rutaConexion,
  loaded: true,
  exports: { poolPromise: Promise.resolve({}), sql: sqlFalso },
};

const { cambiarEstadoPersona } = require("../controller/eventosAsistencia.controller");

async function llamar(pin, body) {
  const log = console.log;
  console.log = () => {};
  let status, respuesta;
  await cambiarEstadoPersona({ params: { pin }, body }, { status: (s) => ((status = s), { json: (b) => (respuesta = b) }) });
  console.log = log;
  return { status, body: respuesta };
}

beforeEach(() => {
  usuarios = new Map([[41235478, { Name: "Juan", IsActive: true }]]);
  cola = [];
  fallarEncolado = false;
  ultimaTransaccion = null;
});

test("desactivar: IsActive = false y se borra su autorización en los huelleros", async () => {
  const { status, body } = await llamar("41235478", { activo: false });

  assert.equal(status, 200);
  assert.equal(body.activo, false);
  assert.deepEqual(body.huelleros, DISPOSITIVOS);
  assert.equal(usuarios.get(41235478).IsActive, false);
  assert.equal(cola.length, 2);
  assert.match(cola[0].CMD, /^C:\d+:DATA DELETE userauthorize Pin=41235478$/);
});

test("activar: IsActive = true y se le devuelve el acceso", async () => {
  usuarios.get(41235478).IsActive = false;
  const { status } = await llamar("41235478", { activo: true });

  assert.equal(status, 200);
  assert.equal(usuarios.get(41235478).IsActive, true);
  assert.match(cola[0].CMD, /^C:\d+:DATA UPDATE userauthorize Pin=41235478\tAuthorizeTimezoneId=1\tAuthorizeDoorId=1$/);
});

test("si falla el envío al huellero, el estado no cambia", async () => {
  fallarEncolado = true;
  const log = console.log;
  console.log = () => {};
  const { status } = await llamar("41235478", { activo: false });
  console.log = log;

  assert.equal(status, 500);
  assert.equal(usuarios.get(41235478).IsActive, true);
  assert.equal(ultimaTransaccion.estado, "deshecha");
});

test("valida el DNI, que exista y que activo sea true o false", async () => {
  assert.equal((await llamar("abc", { activo: false })).status, 400);
  assert.equal((await llamar("41235478", { activo: "no" })).status, 400);
  assert.equal((await llamar("41235478", {})).status, 400);
  assert.equal((await llamar("999", { activo: false })).status, 404);
  assert.equal(cola.length, 0);
});
