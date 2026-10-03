// Tests de POST /api/eventos-asistencia/personas/:pin/huellas (agregar otro dedo)
// La huella se guarda y se envía a los huelleros en una sola transacción.
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

let usuarios, huellas, cola, fallarEncolado, ultimaTransaccion;
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
    const { UserCode, DataIndex, BinaryData, CMD } = this.inputs;
    if (/SELECT RTRIM\(Name\) AS Name FROM dbo\.zk_Users/.test(query)) {
      return { recordset: usuarios.has(UserCode) ? [{ Name: usuarios.get(UserCode) }] : [] };
    }
    if (/SELECT 1 AS existe FROM dbo\.zk_UserData64/.test(query)) {
      return { recordset: huellas.has(`${UserCode}|${DataIndex}`) ? [{ existe: 1 }] : [] };
    }
    if (/INSERT INTO dbo\.zk_UserData64/.test(query)) {
      assert.match(query, /HASHBYTES\('SHA2_256', @BinaryData\)/);
      this.transaccion.pendientes.push(() => huellas.set(`${UserCode}|${DataIndex}`, BinaryData));
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

const { agregarHuella } = require("../controller/eventosAsistencia.controller");

const REAL = Buffer.from("M9SR22-huella-indice");
const CON_RELLENO = Buffer.concat([REAL, Buffer.alloc(2048 - REAL.length)]).toString("base64");

async function llamar(pin, body) {
  const log = console.log;
  console.log = () => {};
  let status, respuesta;
  await agregarHuella({ params: { pin }, body }, { status: (s) => ((status = s), { json: (b) => (respuesta = b) }) });
  console.log = log;
  return { status, body: respuesta };
}

beforeEach(() => {
  usuarios = new Map([[41235478, "Juan"]]);
  huellas = new Map([["41235478|6", Buffer.from("indice-derecho")]]);
  cola = [];
  fallarEncolado = false;
  ultimaTransaccion = null;
});

test("agrega la huella de otro dedo (sin relleno) y la envía a los huelleros", async () => {
  const { status, body } = await llamar("41235478", { dedo: 3, binaryData: `${CON_RELLENO}ç` });

  assert.equal(status, 201);
  assert.deepEqual(body.huelleros, DISPOSITIVOS);
  assert.deepEqual(huellas.get("41235478|3"), REAL);
  assert.equal(huellas.size, 2); // el otro dedo sigue
  assert.equal(cola.length, 2);
  assert.match(cola[0].CMD, new RegExp(`^C:\\d+:DATA UPDATE templatev10 Size=${REAL.length}\\tPin=41235478\\tFingerID=3\\tValid=1\\t`));
  assert.equal(ultimaTransaccion.estado, "confirmada");
});

test("si ese dedo ya tiene huella responde 409 y no cambia nada", async () => {
  const { status, body } = await llamar("41235478", { dedo: 6, binaryData: CON_RELLENO });

  assert.equal(status, 409);
  assert.match(body.msg, /ya tiene huella en ese dedo/);
  assert.deepEqual(huellas.get("41235478|6"), Buffer.from("indice-derecho"));
  assert.equal(cola.length, 0);
});

test("si falla el envío a los huelleros, la huella no se guarda", async () => {
  fallarEncolado = true;
  const { status } = await llamar("41235478", { dedo: 3, binaryData: CON_RELLENO });

  assert.equal(status, 500);
  assert.equal(huellas.has("41235478|3"), false);
  assert.equal(ultimaTransaccion.estado, "deshecha");
});

test("valida persona, dedo y BinaryData", async () => {
  assert.equal((await llamar("999", { dedo: 3, binaryData: CON_RELLENO })).status, 404);
  assert.equal((await llamar("abc", { dedo: 3, binaryData: CON_RELLENO })).status, 400);
  assert.equal((await llamar("41235478", { dedo: 10, binaryData: CON_RELLENO })).status, 400);
  assert.equal((await llamar("41235478", { binaryData: CON_RELLENO })).status, 400);
  assert.equal((await llamar("41235478", { dedo: 3, binaryData: "" })).status, 400);
  assert.equal((await llamar("41235478", { dedo: 3, binaryData: "no es base64!" })).status, 400);
  assert.equal((await llamar("41235478", { dedo: 3, binaryData: Buffer.alloc(30).toString("base64") })).status, 400);
  assert.equal(cola.length, 0);
});
