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
