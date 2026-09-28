// Tests de database/connectionSQLserver.js: la conexión se recupera si el primer intento falla
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { EventEmitter } = require("node:events");

// mssql falso: el primer connect() falla (BD no disponible al arrancar), los siguientes funcionan
let intentos = 0;
class FakeConnectionPool extends EventEmitter {
  async connect() {
    intentos++;
    if (intentos === 1) throw new Error("BD no disponible");
    return this;
  }
}
const rutaMssql = require.resolve("mssql");
require.cache[rutaMssql] = {
  id: rutaMssql,
  filename: rutaMssql,
  loaded: true,
  exports: { ConnectionPool: FakeConnectionPool },
};

const rutaConexion = path.resolve(__dirname, "../database/connectionSQLserver.js");
delete require.cache[rutaConexion];

test("si la conexión inicial falla, la siguiente consulta vuelve a conectar", async () => {
  const errorOriginal = console.error;
  const logOriginal = console.log;
  console.error = console.log = () => {};
  try {
    const { poolPromise } = require(rutaConexion);

    // La conexión inicial al arrancar falla
    await new Promise((r) => setImmediate(r));
    assert.equal(intentos, 1);

    // La primera consulta reintenta y obtiene la conexión
    const pool = await poolPromise;
    assert.ok(pool instanceof FakeConnectionPool);
    assert.equal(intentos, 2);

    // Las siguientes consultas reutilizan la misma conexión
    assert.equal(await poolPromise, pool);
    assert.equal(intentos, 2);

    // Si la conexión se cae, la siguiente consulta crea una nueva
    pool.emit("error", new Error("conexión perdida"));
    const nuevo = await poolPromise;
    assert.notEqual(nuevo, pool);
    assert.equal(intentos, 3);
  } finally {
    console.error = errorOriginal;
    console.log = logOriginal;
  }
});
