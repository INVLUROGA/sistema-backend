// Tests de commandService.broadCastCommand (comando parametrizado, sin inyección SQL)
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const consultas = [];
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
        return { rowsAffected: [2], recordset: [] };
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

const commandService = require("../services/commandService");

test("broadCastCommand envía el comando como parámetro, no concatenado en el SQL", async () => {
  const log = console.log;
  console.log = () => {};
  const cmd = "C:103:DATA UPDATE USERINFO PIN=1\tName=D'Angelo'); DROP TABLE dbo.zk_Users;--";
  await commandService.broadCastCommand(cmd);
  console.log = log;

  assert.equal(consultas.length, 1);
  assert.equal(consultas[0].inputs.CMD, cmd);
  assert.doesNotMatch(consultas[0].query, /D'Angelo|DROP TABLE/);
  assert.match(consultas[0].query, /SELECT DeviceSN, @CMD/);
  assert.match(consultas[0].query, /WHERE IsActive = 1/);
});

test("getrequest entrega un comando por petición, el más antiguo, desempatando por Id", async () => {
  consultas.length = 0;
  await commandService.getRecentCommandByDeviceSN("CRJP230860129");

  assert.equal(consultas.length, 1);
  assert.match(consultas[0].query, /SELECT TOP \(1\) Id, CMD/);
  assert.match(consultas[0].query, /ORDER BY CreationTime ASC, Id ASC/);
  assert.equal(consultas[0].inputs.DeviceSN, "CRJP230860129");
});
