// Tests del guardado de marcaciones (POST /iclock/cdata?table=ATTLOG)
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const express = require("express");

// BD falsa: simula el IF NOT EXISTS guardando las marcaciones en memoria
const guardadas = new Set();
let consultas = [];
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
        if (!/zk_Transactions/.test(query)) return { rowsAffected: [1], recordset: [] };
        const clave = `${inputs.UserCode}|${inputs.Device}|${inputs.PunchTime}`;
        if (guardadas.has(clave)) return { rowsAffected: [], recordset: [] };
        guardadas.add(clave);
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

// WhatsApp falso: los tests nunca envían mensajes reales
const mensajesWsp = [];
const rutaWsp = path.resolve(__dirname, "../config/whatssap-web.js");
require.cache[rutaWsp] = {
  id: rutaWsp,
  filename: rutaWsp,
  loaded: true,
  exports: { enviarMensajesWsp: async (numero, mensaje) => { mensajesWsp.push({ numero, mensaje }); return { ok: true }; } },
};

const transactionService = require("../services/transactionService");
const cdataController = require("../controller/ZkTeco/iclock/cdataController");

const TRAMA = "76069670\t2026-09-28 11:30:05\t0\t1\t0\t0\t0\t255\t0\t0\n" +
  "1234\t2026-09-28 11:31:00\t1\t1\t0\t0\t0\t255\t0\t0\n";

// Silencia los console.log de los controladores durante los tests
const silenciar = () => {
  const original = { log: console.log, warn: console.warn };
  console.log = console.warn = () => {};
  return () => Object.assign(console, original);
};

beforeEach(() => {
  guardadas.clear();
  mensajesWsp.length = 0;
  consultas = [];
});

test("la hora del equipo se guarda como hora de Perú (UTC-5) sin depender del servidor", async () => {
  const restaurar = silenciar();
  await transactionService.insertTransaction(
    transactionService.segmentarTramaTrans(TRAMA),
    "CRJP230860129"
  );
  restaurar();
  const inserts = consultas.filter((c) => /zk_Transactions/.test(c.query));
  assert.equal(inserts[0].inputs.PunchTime, "2026-09-28T16:30:05.000Z");
  assert.equal(inserts[0].inputs.UserCode, 76069670);
  assert.equal(inserts[0].inputs.Device, "CRJP230860129");
});

test("no duplica marcaciones cuando el equipo reenvía su historial", async () => {
  const restaurar = silenciar();
  const datos = transactionService.segmentarTramaTrans(TRAMA);
  const primera = await transactionService.insertTransaction(datos, "CRJP230860129");
  const segunda = await transactionService.insertTransaction(datos, "CRJP230860129");
  restaurar();
  assert.equal(primera, 2);
  assert.equal(segunda, 0);
  assert.match(consultas.find((c) => /zk_Transactions/.test(c.query)).query, /IF NOT EXISTS/);
});

test("POST /iclock/cdata?table=ATTLOG acepta la trama en texto plano y responde ok", async () => {
  const restaurar = silenciar();
  // Misma configuración de parsers que index.js
  const app = express();
  app.use("/iclock", express.text({ type: "*/*", limit: "50mb" }));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.post("/iclock/cdata", cdataController.fxpost);
  const server = app.listen(0);

  try {
    const { port } = server.address();
    // Algunos firmwares envían las tramas con Content-Type de formulario
    for (const contentType of ["text/plain", "application/x-www-form-urlencoded"]) {
      guardadas.clear();
      const res = await fetch(`http://127.0.0.1:${port}/iclock/cdata?SN=CRJP230860129&table=ATTLOG`, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: TRAMA,
      });
      assert.equal(res.status, 200);
      assert.equal(await res.text(), "ok");
      assert.equal(guardadas.size, 2);
    }
  } finally {
    server.close();
    restaurar();
  }
});

test("cada marcación guarda label_estado: colaborador, activo para [programa] o cliente sin membresía", async () => {
  const restaurar = silenciar();
  await transactionService.insertTransaction(transactionService.segmentarTramaTrans(TRAMA), "CRJP230860129");
  restaurar();

  const insert = consultas.find((c) => /INSERT INTO dbo\.zk_Transactions/.test(c.query));
  assert.match(insert.query, /\(UserCode, Device, PunchTime, UploadTime, label_estado\)/);
  assert.match(insert.query, /VALUES \(@UserCode, @Device, @PunchTime, .*, @label\)/s);
  // El cálculo va dentro del IF NOT EXISTS: las repetidas no se recalculan ni se insertan
  assert.match(insert.query, /IF NOT EXISTS \([\s\S]*\)\s*BEGIN[\s\S]*INSERT INTO[\s\S]*END/);
  // Día en hora de Perú y membresía vigente ese día según el seguimiento
  assert.match(insert.query, /SWITCHOFFSET\(@PunchTime, '-05:00'\)/);
  assert.match(insert.query, /CAST\(m\.fecha_inicio AS DATE\) <= @dia AND CAST\(s\.fecha_vencimiento AS DATE\) >= @dia/);
  // Orden de prioridad: colaborador > activo para [programa] > (desactivado a mano) > sin membresía
  const orden = ["@LabelColaborador", "@LabelActivoPara", "@LabelInactiva", "@LabelSinMembresia"].map((l) => insert.query.indexOf(l));
  assert.deepEqual([...orden].sort((a, b) => a - b), orden);
  assert.deepEqual(
    {
      colaborador: insert.inputs.LabelColaborador,
      activoPara: insert.inputs.LabelActivoPara,
      sinMembresia: insert.inputs.LabelSinMembresia,
      inactiva: insert.inputs.LabelInactiva,
    },
    { colaborador: "Es colaborador", activoPara: "activo para ", sinMembresia: "cliente sin membresia", inactiva: "membresia inactiva" }
  );
});

test("cliente sin membresía: log en cada marcación nueva, pero un solo WhatsApp por día", async () => {
  const requestOriginal = fakePool.request;
  const reservas = new Set(); // simula el índice único de tb_mensaje_membresia
  fakePool.request = function () {
    const r = requestOriginal.call(this);
    const q = r.query.bind(r);
    const inputs = {};
    const input = r.input.bind(r);
    r.input = (nombre, tipo, valor) => { inputs[nombre] = valor; input(nombre, tipo, valor); return r; };
    r.query = async (query) => {
      if (/INSERT INTO dbo.tb_mensaje_membresia/.test(query)) {
        const clave = `${inputs.tipo}|${inputs.telefono}|${inputs.dia}`;
        if (reservas.has(clave)) return { rowsAffected: [0], recordset: [] };
        reservas.add(clave);
        return { rowsAffected: [1], recordset: [{ id: reservas.size }] };
      }
      const res = await q(query);
      if (/zk_Transactions/.test(query) && res.rowsAffected.length) {
        const dia = String(inputs.PunchTime).slice(0, 10);
        res.recordset = [{ label: "cliente sin membresia", dni: "76069670", nombre: "Ana Ruiz", telefono: "951 473 211", id_cli: 5, dia }];
      }
      return res;
    };
    return r;
  };
  const logs = [];
  const original = console.log;
  console.log = (m) => logs.push(m);
  const marcar = async (hora) => {
    await transactionService.insertTransaction(
      transactionService.segmentarTramaTrans(`76069670	${hora}	0	1	0	0	0	255	0	0
`),
      "CRJP230860129"
    );
    for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r)); // aviso en segundo plano
  };
  try {
    await marcar("2026-09-28 11:30:05");
    await marcar("2026-09-28 11:30:05"); // repetida (el huellero reenvía su historial)
    await marcar("2026-09-28 11:31:40"); // otro intento el mismo día
    await marcar("2026-09-29 08:00:00"); // al día siguiente
  } finally {
    console.log = original;
    fakePool.request = requestOriginal;
  }
  const avisos = logs.filter((l) => /CLIENTE SIN MEMBRESÍA/.test(l));
  assert.equal(avisos.length, 3, "un log por marcación nueva (la repetida no)");
  assert.match(avisos[0], /Ana Ruiz | DNI: 76069670 | PIN: 76069670 | WhatsApp: 51951473211/);
  assert.deepEqual(mensajesWsp.map((m) => m.numero), ["51951473211", "51951473211"], "uno el 28 y otro el 29");
  assert.match(mensajesWsp[0].mensaje, /HOLA, Ana Ruiz/);
  assert.ok(logs.some((l) => /WhatsApp a 51951473211 omitido: ya se le avisó el 2026-09-28/.test(l)));
});

test("telefonoWsp: celular de Perú con 51 delante, o null si no es válido", () => {
  const { telefonoWsp } = transactionService;
  assert.equal(telefonoWsp("951473211"), "51951473211");
  assert.equal(telefonoWsp(" +51 951-473-211 "), "51951473211");
  assert.equal(telefonoWsp("51951473211"), "51951473211");
  for (const malo of [null, "", "0", "12345", "014567890", "851473211"]) assert.equal(telefonoWsp(malo), null, String(malo));
});
