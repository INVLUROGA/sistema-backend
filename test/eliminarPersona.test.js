// Tests de DELETE /api/eventos-asistencia/personas/:pin
// La persona y sus huellas se borran de la BD y se envía el borrado a los huelleros, en una transacción.
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// BD falsa con transacciones: los cambios solo se aplican con commit()
let usuarios, huellas, marcaciones, cola, fallarEncolado, ultimaTransaccion;
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
    const { UserCode, CMD, orden } = this.inputs;
    if (/SELECT RTRIM\(Name\) AS Name FROM dbo\.zk_Users/.test(query)) {
      return { recordset: usuarios.has(UserCode) ? [{ Name: usuarios.get(UserCode) }] : [] };
    }
    if (/DELETE FROM dbo\.zk_UserData64 WHERE UserCode = @UserCode$/.test(query.trim())) {
      this.transaccion.pendientes.push(() => {
        for (const clave of [...huellas.keys()]) if (clave.startsWith(`${UserCode}|`)) huellas.delete(clave);
      });
      return { rowsAffected: [1] };
    }
    if (/DELETE FROM dbo\.zk_Users/.test(query)) {
      // Respeta la FOREIGN KEY: no se puede borrar el usuario si todavía tiene huellas
      const tieneHuellas = [...huellas.keys()].some((c) => c.startsWith(`${UserCode}|`));
      const huellasYaBorradas = this.transaccion.pendientes.length > 0;
      if (tieneHuellas && !huellasYaBorradas) throw new Error("FOREIGN KEY");
      this.transaccion.pendientes.push(() => usuarios.delete(UserCode));
      return { rowsAffected: [1] };
    }
    if (/INSERT INTO dbo\.zk_QueueCMD/.test(query)) {
      if (fallarEncolado) throw new Error("BD caída");
      assert.doesNotMatch(query, /Pin=/); // el comando nunca va concatenado en el SQL
      const filas = DISPOSITIVOS.map((DeviceSN) => ({ DeviceSN, CMD, orden }));
      this.transaccion.pendientes.push(() => cola.push(...filas));
      return { recordset: filas.map(({ DeviceSN }) => ({ DeviceSN })) };
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

const { eliminarPersona } = require("../controller/eventosAsistencia.controller");

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
const silenciar = () => {
  const original = { log: console.log };
  console.log = () => {};
  return () => Object.assign(console, original);
};

beforeEach(() => {
  usuarios = new Map([
    [123222240, "alejandro dedo medio"],
    [337788, "CARLOSDEDOPULGAR"],
  ]);
  huellas = new Map([
    ["123222240|2", 1],
    ["123222240|6", 1],
    ["337788|6", 1],
  ]);
  marcaciones = [{ pin: 123222240, hora: "17:00" }];
  cola = [];
  fallarEncolado = false;
  ultimaTransaccion = null;
});

test("borra a la persona y todas sus huellas, y lo envía a los huelleros en orden", async () => {
  const restaurar = silenciar();
  const res = crearRes();
  await eliminarPersona({ params: { pin: "123222240" } }, res);
  restaurar();

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.persona, { pin: 123222240, nombre: "alejandro dedo medio" });
  assert.deepEqual(res.body.huelleros, DISPOSITIVOS);
  assert.equal(usuarios.has(123222240), false);
  assert.deepEqual([...huellas.keys()], ["337788|6"]); // las de otras personas no se tocan
  assert.equal(usuarios.has(337788), true);
  assert.equal(marcaciones.length, 1); // el historial de asistencia se conserva

  // Por huellero: autorización -> huellas -> usuario, cada uno 1 s después del anterior
  const delEquipo = cola.filter((c) => c.DeviceSN === "CRJP230860129");
  assert.deepEqual(delEquipo.map((c) => c.orden), [0, 1, 2]);
  assert.match(delEquipo[0].CMD, /^C:\d+:DATA DELETE userauthorize Pin=123222240$/);
  assert.match(delEquipo[1].CMD, /^C:\d+:DATA DELETE templatev10 Pin=123222240$/);
  assert.match(delEquipo[2].CMD, /^C:\d+:DATA DELETE user Pin=123222240$/);
  assert.equal(ultimaTransaccion.estado, "confirmada");
});

test("si la persona no existe responde 404 y no envía nada", async () => {
  const res = crearRes();
  await eliminarPersona({ params: { pin: "999" } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(cola.length, 0);
  assert.equal(ultimaTransaccion.estado, "deshecha");
});

test("si falla el envío a los huelleros, la persona NO se borra de la BD", async () => {
  fallarEncolado = true;
  const restaurar = silenciar();
  const res = crearRes();
  await eliminarPersona({ params: { pin: "123222240" } }, res);
  restaurar();

  assert.equal(res.statusCode, 500);
  assert.equal(usuarios.has(123222240), true);
  assert.equal(huellas.has("123222240|2"), true);
  assert.equal(cola.length, 0);
  assert.equal(ultimaTransaccion.estado, "deshecha");
});

test("valida el DNI", async () => {
  for (const pin of ["abc", "0", "-5", "1234567890"]) {
    const res = crearRes();
    await eliminarPersona({ params: { pin } }, res);
    assert.equal(res.statusCode, 400, pin);
  }
});
