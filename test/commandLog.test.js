// Tests del historial de comandos: /iclock/getrequest registra lo que entrega y
// /iclock/devicecmd guarda el resultado (Return) que informa el equipo.
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// BD falsa: cola y zk_CommandLog en memoria (entregados: filas con marca de entrega)
let cola, log, fallarLog, entregados;
const fakePool = {
  request() {
    const inputs = {};
    return {
      input(nombre, _tipo, valor) {
        inputs[nombre] = valor;
        return this;
      },
      async query(query) {
        if (/SELECT TOP \(1\) Id, CMD\s+FROM dbo\.zk_QueueCMD/.test(query)) {
          const c = cola.find((x) => x.DeviceSN === inputs.DeviceSN);
          return { recordset: c ? [c] : [] };
        }
        if (/DELETE FROM dbo\.zk_QueueCMD/.test(query)) {
          cola = cola.filter((x) => x.Id !== inputs.Id);
          return { rowsAffected: [1] };
        }
        if (/UPDATE registrado SET EntregadoEn/.test(query)) {
          if (fallarLog) throw new Error("tabla inexistente");
          const fila = [...log].reverse().find(
            (f) => f.DeviceSN === inputs.DeviceSN && f.CmdId === inputs.CmdId && !entregados.has(f)
          );
          if (!fila) return { rowsAffected: [0] };
          entregados.add(fila);
          return { rowsAffected: [1] };
        }
        if (/INSERT INTO dbo\.zk_CommandLog/.test(query)) {
          if (fallarLog) throw new Error("tabla inexistente");
          const fila = { ...inputs, Resultado: null };
          log.push(fila);
          entregados.add(fila); // al insertarse en la entrega ya lleva EntregadoEn
          return { rowsAffected: [1] };
        }
        if (/UPDATE ultimo SET Resultado/.test(query)) {
          const fila = [...log].reverse().find(
            (f) => f.DeviceSN === inputs.DeviceSN && f.CmdId === inputs.CmdId && f.Resultado === null
          );
          if (!fila) return { rowsAffected: [0] };
          fila.Resultado = inputs.Resultado;
          return { rowsAffected: [1] };
        }
        if (/zk_Devices/.test(query)) return { rowsAffected: [1], recordset: [] }; // latido
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

const getrequestController = require("../controller/ZkTeco/iclock/getrequestController");
const devicecmdController = require("../controller/ZkTeco/iclock/devicecmdController");

const SN = "CRJP230860129";
const crearRes = () => ({
  statusCode: 200,
  body: null,
  status(c) {
    this.statusCode = c;
    return this;
  },
  send(b) {
    this.body = b;
    return this;
  },
});
const req = (query, body) => ({ query, body, headers: {}, socket: {} });
const silenciar = () => {
  const o = { log: console.log, warn: console.warn, error: console.error };
  console.log = console.warn = console.error = () => {};
  return () => Object.assign(console, o);
};

beforeEach(() => {
  cola = [
    { Id: 1, DeviceSN: SN, CMD: "C:500:DATA UPDATE templatev10 Size=4\tPin=41235478\tFingerID=6\tValid=1\tTemplate=AAAA\tEndTag=" },
    { Id: 2, DeviceSN: SN, CMD: "C:501:DATA QUERY tablename=user,fielddesc=*,filter=*" },
  ];
  log = [];
  entregados = new Set();
  fallarLog = false;
});

test("si el borrado se registró al pedirlo, la entrega solo lo marca (no duplica la fila)", async () => {
  cola = [{ Id: 9, DeviceSN: SN, CMD: "C:700:DATA DELETE user Pin=41235478" }];
  // Registrado al eliminar a la persona (sin marca de entrega)
  const pedido = { DeviceSN: SN, CmdId: "700", Pin: 41235478, Dedo: null, Operacion: "borrado del usuario", Nombre: "Juan", Resultado: null };
  log.push(pedido);

  const restaurar = silenciar();
  await getrequestController.fxget(req({ SN }), crearRes());
  await devicecmdController.fxpost(req({ SN }, "ID=700&Return=0&CMD=DATA"), crearRes());
  restaurar();

  assert.equal(log.length, 1);
  assert.equal(entregados.has(pedido), true);
  assert.equal(pedido.Resultado, 0);
});

test("getrequest registra el comando entregado con su persona, dedo y operación", async () => {
  const restaurar = silenciar();
  const res = crearRes();
  await getrequestController.fxget(req({ SN }), res);
  restaurar();

  assert.match(res.body, /^C:500:DATA UPDATE templatev10/);
  assert.equal(cola.length, 1); // sale de la cola
  assert.deepEqual(log, [
    { DeviceSN: SN, CmdId: "500", Pin: 41235478, Dedo: 6, Operacion: "envío de huella", Resultado: null },
  ]);
});

test("los comandos que no son de una persona también se registran (ej. DATA QUERY)", async () => {
  cola.shift();
  const restaurar = silenciar();
  await getrequestController.fxget(req({ SN }), crearRes());
  restaurar();

  assert.deepEqual(log, [
    { DeviceSN: SN, CmdId: "501", Pin: null, Dedo: null, Operacion: "consulta de datos", Resultado: null },
  ]);
});

test("devicecmd guarda el Return del equipo en el comando entregado", async () => {
  const restaurar = silenciar();
  await getrequestController.fxget(req({ SN }), crearRes());
  const res = crearRes();
  await devicecmdController.fxpost(req({ SN }, "ID=500&Return=-1002&CMD=DATA"), res);
  restaurar();

  assert.equal(res.body, "ok");
  assert.equal(log[0].Resultado, -1002);
});

test("si falla el historial, el equipo igual recibe su comando y su respuesta", async () => {
  fallarLog = true;
  const restaurar = silenciar();
  const res = crearRes();
  await getrequestController.fxget(req({ SN }), res);
  const res2 = crearRes();
  await devicecmdController.fxpost(req({ SN }, "ID=500&Return=0&CMD=DATA"), res2);
  restaurar();

  assert.equal(res.statusCode, 200);
  assert.match(res.body, /^C:500:/);
  assert.equal(res2.body, "ok");
});
