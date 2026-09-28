// Tests de POST /api/eventos-asistencia/sincronizar (huellero -> sistema)
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// BD falsa: huelleros y cola de comandos
let dispositivos;
let cola;
const fakePool = {
  request() {
    const inputs = {};
    return {
      input(nombre, _tipo, valor) {
        inputs[nombre] = valor;
        return this;
      },
      async query(query) {
        if (/FROM dbo\.zk_Devices/.test(query)) return { recordset: dispositivos };
        if (/SELECT COUNT\(\*\) AS n\s+FROM dbo\.zk_QueueCMD/.test(query)) {
          const n = cola.filter((c) => c.DeviceSN === inputs.DeviceSN && /^C:\d+:DATA QUERY /.test(c.CMD)).length;
          return { recordset: [{ n }] };
        }
        if (/INSERT INTO dbo\.zk_QueueCMD/.test(query)) {
          cola.push({ DeviceSN: inputs.DeviceSN, CMD: inputs.CMD, segundosDespues: inputs.segundosDespues });
          return { rowsAffected: [1] };
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

const { sincronizarHuelleros } = require("../controller/eventosAsistencia.controller");

const enLinea = (DeviceSN) => ({ DeviceSN, IsActive: true, ultima_conexion: new Date(), ultima_ip: "1.1.1.1" });
const fueraDeLinea = (DeviceSN) => ({ DeviceSN, IsActive: true, ultima_conexion: null, ultima_ip: null });

async function llamar() {
  const log = console.log;
  console.log = () => {};
  let status, body;
  await sincronizarHuelleros({}, { status: (s) => ((status = s), { json: (b) => (body = b) }) });
  console.log = log;
  return { status, body };
}

beforeEach(() => {
  dispositivos = [enLinea("CRJP230860129"), fueraDeLinea("CRJP230860136")];
  cola = [];
});

test("pide personas y luego huellas solo a los huelleros en línea", async () => {
  const { status, body } = await llamar();

  assert.equal(status, 200);
  assert.deepEqual(body.solicitados, ["CRJP230860129"]);
  assert.deepEqual(body.omitidos, [{ DeviceSN: "CRJP230860136", motivo: "fuera de línea" }]);

  // Personas primero y huellas 1 s después (cada huella exige que su persona exista)
  assert.equal(cola.length, 2);
  assert.match(cola[0].CMD, /^C:(\d+):DATA QUERY tablename=user,fielddesc=\*,filter=\*$/);
  assert.equal(cola[0].segundosDespues, 0);
  assert.match(cola[1].CMD, /^C:(\d+):DATA QUERY tablename=templatev10,fielddesc=\*,filter=\*$/);
  assert.equal(cola[1].segundosDespues, 1);
  // Cada comando con su propio ID (el equipo informa el resultado por ID)
  assert.notEqual(cola[0].CMD.split(":")[1], cola[1].CMD.split(":")[1]);
});

test("no repite la sincronización si ya hay una en curso", async () => {
  await llamar();
  const { status, body } = await llamar();

  assert.equal(status, 409);
  assert.equal(cola.length, 2);
  assert.match(body.msg, /ya hay una sincronización en curso/);
});

test("si ningún huellero está en línea, avisa y no encola nada", async () => {
  dispositivos = [fueraDeLinea("CRJP230860129")];
  const { status, body } = await llamar();

  assert.equal(status, 409);
  assert.match(body.msg, /CRJP230860129 \(fuera de línea\)/);
  assert.equal(cola.length, 0);
});
