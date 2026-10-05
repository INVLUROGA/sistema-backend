// Tests de actualizarClientesSeguimiento: zk_Users.IsActive = false si la membresía venció, y se
// envía al huellero (sin autorización de acceso no puede entrar)
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

let seguimientos, salida, consultas, ultimaTransaccion, fallarUpdate;

class FakeTransaction {
  constructor() {
    this.estado = "nueva";
  }
  async begin() {
    this.estado = "abierta";
  }
  async commit() {
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
    consultas.push({ query, inputs: this.inputs, enTransaccion: Boolean(this.transaccion) });
    if (/UPDATE u/.test(query)) {
      if (fallarUpdate) throw new Error("BD caída");
      return { recordset: salida };
    }
    throw new Error(`Consulta inesperada: ${query}`);
  }
}
// Consultas fuera de transacción (el conteo de seguimientos)
const fakePool = {
  request() {
    const r = new FakeRequest(null);
    r.query = async (query) => {
      consultas.push({ query, inputs: r.inputs, enTransaccion: false });
      if (/SELECT COUNT\(\*\) AS n FROM dbo\.tb_seguimientos/.test(query)) return { recordset: [{ n: seguimientos }] };
      throw new Error(`Consulta inesperada: ${query}`);
    };
    return r;
  },
};
const mssql = require("mssql");
const sqlFalso = Object.assign(Object.create(mssql), { Transaction: FakeTransaction, Request: FakeRequest });
const rutaConexion = path.resolve(__dirname, "../database/connectionSQLserver.js");
require.cache[rutaConexion] = {
  id: rutaConexion,
  filename: rutaConexion,
  loaded: true,
  exports: { poolPromise: Promise.resolve(fakePool), sql: sqlFalso },
};

const { actualizarClientesSeguimiento, hoyPeru } = require("../middlewares/EventosCron/actualizarClientesSeguimiento");

const silenciar = () => {
  const o = { log: console.log, warn: console.warn, error: console.error };
  console.log = console.warn = console.error = () => {};
  return () => Object.assign(console, o);
};

beforeEach(() => {
  seguimientos = 1278;
  salida = [];
  consultas = [];
  ultimaTransaccion = null;
  fallarUpdate = false;
});

test("desactiva a los vencidos, reactiva a los que renovaron y lo envía al huellero", async () => {
  salida = [
    { UserCode: 1, activo: false },
    { UserCode: 2, activo: false },
    { UserCode: 3, activo: true },
  ];
  const restaurar = silenciar();
  // 05/10 a las 23:30 en Perú = 06/10 04:30 UTC: para Perú sigue siendo el 05/10
  const r = await actualizarClientesSeguimiento(new Date("2026-10-06T04:30:00Z"));
  restaurar();

  assert.deepEqual(r, { hoy: "2026-10-05", desactivados: 2, reactivados: 1 });
  const update = consultas.find((c) => /UPDATE u/.test(c.query));
  assert.equal(update.enTransaccion, true);
  assert.equal(ultimaTransaccion.estado, "confirmada");
  assert.equal(update.inputs.hoy, "2026-10-05");
  // Vencido = vencimiento anterior a hoy; se usa el vencimiento más lejano por documento
  assert.match(update.query, /CASE WHEN v\.vence < @hoy THEN 0 ELSE 1 END/);
  assert.match(update.query, /MAX\(CAST\(s\.fecha_vencimiento AS date\)\) AS vence/);
  // Unión por DNI y sin tocar a los empleados activos
  assert.match(update.query, /v\.doc = LTRIM\(RTRIM\(u\.dni\)\)/);
  assert.match(update.query, /NOT EXISTS \(\s*SELECT 1 FROM dbo\.tb_empleados e\s*WHERE e\.flag = 1/);
  // Solo cambia a quienes tienen otro estado
  assert.match(update.query, /WHERE ISNULL\(u\.IsActive, 1\) <> n\.activo/);
  // Al huellero: desactivado -> borrar autorización; reactivado -> devolverla (franja 1, puerta 1)
  assert.match(update.query, /INSERT INTO dbo\.zk_QueueCMD/);
  assert.match(update.query, /'DATA DELETE userauthorize Pin='/);
  assert.match(update.query, /'DATA UPDATE userauthorize Pin='.*'AuthorizeTimezoneId=', @franja.*'AuthorizeDoorId=', @puertas/s);
  assert.match(update.query, /FROM @cambios\) c\s*CROSS JOIN dbo\.zk_Devices d\s*WHERE d\.IsActive = 1/);
  assert.deepEqual({ franja: update.inputs.franja, puertas: update.inputs.puertas }, { franja: 1, puertas: 1 });
});

test("si falla, se deshace todo (estado y órdenes al huellero)", async () => {
  fallarUpdate = true;
  const restaurar = silenciar();
  const r = await actualizarClientesSeguimiento(new Date("2026-10-05T15:00:00Z"));
  restaurar();

  assert.equal(r.error, "BD caída");
  assert.equal(ultimaTransaccion.estado, "deshecha");
});

test("si tb_seguimientos está vacía (falló la reconstrucción), no cambia nada", async () => {
  seguimientos = 0;
  const restaurar = silenciar();
  const r = await actualizarClientesSeguimiento(new Date("2026-10-05T15:00:00Z"));
  restaurar();

  assert.equal(r.omitido, "sin seguimientos");
  assert.equal(consultas.some((c) => /UPDATE u/.test(c.query)), false);
});

test("hoyPeru usa la zona horaria de Lima", () => {
  assert.equal(hoyPeru(new Date("2026-10-06T04:59:00Z")), "2026-10-05");
  assert.equal(hoyPeru(new Date("2026-10-06T05:00:00Z")), "2026-10-06");
});
