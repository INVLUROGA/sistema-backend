// Tests de DELETE /api/eventos-asistencia/personas/:pin/huellas/:dedo
// La huella se borra de la BD y se envía el borrado a los huelleros, en una sola transacción.
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// BD falsa con transacciones: los cambios solo se aplican con commit()
let huellas = new Map();
let cola = [];
let fallarEncolado = false;
let pedidos = []; // zk_CommandLog: borrados registrados al pedirlos
const DISPOSITIVOS = ["CRJP230860129", "CRJP230860136"];

class FakeTransaction {
  constructor() {
    this.pendientes = { borrar: [], encolar: [], pedidos: [] };
    this.estado = "nueva";
  }
  async begin() {
    this.estado = "abierta";
  }
  async commit() {
    for (const clave of this.pendientes.borrar) huellas.delete(clave);
    cola.push(...this.pendientes.encolar);
    pedidos.push(...this.pendientes.pedidos);
    this.estado = "confirmada";
  }
  async rollback() {
    this.estado = "deshecha";
  }
}
let ultimaTransaccion = null;
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
    const { UserCode, DataIndex, CMD } = this.inputs;
    if (/DELETE FROM dbo\.zk_UserData64/.test(query)) {
      assert.match(query, /DataLabel = 'FP'/);
      const clave = `${UserCode}|${DataIndex}`;
      if (!huellas.has(clave)) return { rowsAffected: [0] };
      this.transaccion.pendientes.borrar.push(clave);
      return { rowsAffected: [1] };
    }
    if (/INSERT INTO dbo\.zk_QueueCMD/.test(query)) {
      if (fallarEncolado) throw new Error("BD caída");
      assert.doesNotMatch(query, /Pin=/); // el comando nunca va concatenado en el SQL
      const filas = DISPOSITIVOS.map((DeviceSN) => ({ DeviceSN, CMD }));
      this.transaccion.pendientes.encolar.push(...filas);
      return { recordset: filas.map(({ DeviceSN }) => ({ DeviceSN })), rowsAffected: [filas.length] };
    }
    if (/INSERT INTO dbo\.zk_CommandLog/.test(query)) {
      assert.doesNotMatch(query, /EntregadoEn/); // se registra sin marca de entrega
      this.transaccion.pendientes.pedidos.push({ ...this.inputs });
      return { rowsAffected: [1] };
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

const { eliminarHuella } = require("../controller/eventosAsistencia.controller");

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
  huellas = new Map([
    ["123222240|2", Buffer.from("a")],
    ["123222240|6", Buffer.from("b")],
  ]);
  cola = [];
  pedidos = [];
  fallarEncolado = false;
  ultimaTransaccion = null;
});

test("borra la huella de la BD y envía el borrado a todos los huelleros activos", async () => {
  const restaurar = silenciar();
  const res = crearRes();
  await eliminarHuella({ params: { pin: "123222240", dedo: "2" } }, res);
  restaurar();

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.huelleros, DISPOSITIVOS);
  assert.equal(huellas.has("123222240|2"), false);
  assert.equal(huellas.has("123222240|6"), true); // el otro dedo no se toca
  assert.equal(cola.length, 2);
  assert.match(cola[0].CMD, /^C:\d+:DATA DELETE templatev10 Pin=123222240\tFingerID=2$/);
  assert.equal(ultimaTransaccion.estado, "confirmada");

  // El borrado queda registrado por huellero para seguir su estado (pendiente -> sincronizado)
  assert.deepEqual(
    pedidos.map((p) => ({ DeviceSN: p.DeviceSN, Pin: p.Pin, Dedo: p.Dedo, Operacion: p.Operacion })),
    DISPOSITIVOS.map((DeviceSN) => ({ DeviceSN, Pin: 123222240, Dedo: 2, Operacion: "borrado de huella" }))
  );
  assert.equal(pedidos[0].CmdId, cola[0].CMD.split(":")[1]);
});

test("si la huella no existe responde 404 y no envía nada", async () => {
  const res = crearRes();
  await eliminarHuella({ params: { pin: "123222240", dedo: "9" } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(cola.length, 0);
  assert.equal(ultimaTransaccion.estado, "deshecha");
});

test("si falla el envío al huellero, la huella NO se borra de la BD (quedan sincronizados)", async () => {
  fallarEncolado = true;
  const restaurar = silenciar();
  const res = crearRes();
  await eliminarHuella({ params: { pin: "123222240", dedo: "2" } }, res);
  restaurar();

  assert.equal(res.statusCode, 500);
  assert.equal(huellas.has("123222240|2"), true);
  assert.equal(cola.length, 0);
  assert.equal(ultimaTransaccion.estado, "deshecha");
});

test("valida el DNI y el dedo", async () => {
  for (const params of [
    { pin: "abc", dedo: "2" },
    { pin: "0", dedo: "2" },
    { pin: "123222240", dedo: "10" },
    { pin: "123222240", dedo: "x" },
  ]) {
    const res = crearRes();
    await eliminarHuella({ params }, res);
    assert.equal(res.statusCode, 400, JSON.stringify(params));
  }
  assert.equal(cola.length, 0);
});
