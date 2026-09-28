// Tests de enviarMensajeMembresiaPorFinalizar1diaAntes / 1SemanaAntes:
// cada aviso debe enviarse UNA sola vez por teléfono y día de vencimiento.
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { UniqueConstraintError } = require("sequelize");

// --- Dobles de prueba (sin BD ni WhatsApp reales) ---
let seguimientos = [];
let ultimoWhereSeguimientos = null;
const registros = new Map(); // clave única -> registro
let enviados = [];
let respuestaWsp = () => ({ ok: true, data: { sent: "true", message: "ok" } });

const stub = (ruta, exports) => {
  const r = path.resolve(__dirname, ruta);
  require.cache[r] = { id: r, filename: r, loaded: true, exports };
};
stub("../models/Seguimientos.js", {
  Seguimiento: {
    async findAll({ where }) {
      ultimoWhereSeguimientos = where;
      return seguimientos;
    },
  },
});
stub("../models/MensajeMembresia.js", {
  MensajeMembresia: {
    async create(datos) {
      // Simula el índice único (tipo, telefono, fecha_vencimiento) de la BD
      await new Promise((r) => setImmediate(r));
      const clave = `${datos.tipo}|${datos.telefono}|${datos.fecha_vencimiento}`;
      if (registros.has(clave)) throw new UniqueConstraintError({});
      const registro = {
        ...datos,
        estado: "pendiente",
        async update(cambios) {
          Object.assign(registro, cambios);
        },
      };
      registros.set(clave, registro);
      return registro;
    },
  },
});
stub("../config/whatssap-web.js", {
  async enviarMensajesWsp(telefono, mensaje) {
    enviados.push({ telefono, mensaje });
    return respuestaWsp(telefono);
  },
});

const cron = require("../middlewares/EventosCron/mensajeMembresiaPorFinalizarSeguimientoActivos");

const seg = (id_cli, tel_cli) => ({ id_cli, cli: tel_cli === undefined ? null : { tel_cli } });

const silenciar = () => {
  const original = { log: console.log, error: console.error };
  const errores = [];
  console.log = () => {};
  console.error = (...a) => errores.push(a.join(" "));
  return { errores, restaurar: () => Object.assign(console, original) };
};

beforeEach(() => {
  seguimientos = [];
  registros.clear();
  enviados = [];
  respuestaWsp = () => ({ ok: true, data: { sent: "true", message: "ok" } });
});

test("envía un aviso por teléfono y omite clientes sin teléfono", async () => {
  seguimientos = [seg(1, "966713466"), seg(2, "941102444"), seg(3, ""), seg(4, undefined)];
  const s = silenciar();
  const r = await cron.enviarMensajeMembresiaPorFinalizar1diaAntes();
  s.restaurar();

  assert.deepEqual(enviados.map((e) => e.telefono), ["966713466", "941102444"]);
  assert.match(enviados[0].mensaje, /\*Mañana\* termina tu plan/);
  assert.equal(r.enviados, 2);
  assert.equal([...registros.values()].every((x) => x.estado === "enviado"), true);
});

test("teléfono compartido o repetido (con espacios) recibe un solo aviso", async () => {
  seguimientos = [seg(1, "966713466"), seg(2, "966 713 466"), seg(1, "966713466")];
  const s = silenciar();
  await cron.enviarMensajeMembresiaPorFinalizar1SemanaAntes();
  s.restaurar();

  assert.equal(enviados.length, 1);
});

test("si el cron se ejecuta otra vez (reinicio, otro servidor), no reenvía", async () => {
  seguimientos = [seg(1, "966713466"), seg(2, "941102444")];
  const s = silenciar();
  await cron.enviarMensajeMembresiaPorFinalizar1diaAntes();
  const segunda = await cron.enviarMensajeMembresiaPorFinalizar1diaAntes();
  s.restaurar();

  assert.equal(enviados.length, 2);
  assert.deepEqual({ enviados: segunda.enviados, omitidos: segunda.omitidos }, { enviados: 0, omitidos: 2 });
});

test("dos servidores ejecutando el cron al mismo tiempo envían una sola vez", async () => {
  seguimientos = [seg(1, "966713466"), seg(2, "941102444"), seg(3, "906929444")];
  const s = silenciar();
  await Promise.all([
    cron.enviarMensajeMembresiaPorFinalizar1diaAntes(),
    cron.enviarMensajeMembresiaPorFinalizar1diaAntes(),
  ]);
  s.restaurar();

  assert.equal(enviados.length, 3);
  assert.equal(new Set(enviados.map((e) => e.telefono)).size, 3);
});

test("el aviso de 1 día y el de 1 semana son independientes", async () => {
  seguimientos = [seg(1, "966713466")];
  const s = silenciar();
  await cron.enviarMensajeMembresiaPorFinalizar1diaAntes();
  await cron.enviarMensajeMembresiaPorFinalizar1SemanaAntes();
  s.restaurar();

  assert.equal(enviados.length, 2);
  assert.deepEqual([...registros.values()].map((x) => x.tipo).sort(), ["1-dia", "1-semana"]);
});

test("registra como error la respuesta de UltraMsg con error y el fallo de red, sin detener el resto", async () => {
  seguimientos = [seg(1, "111"), seg(2, "222"), seg(3, "333")];
  respuestaWsp = (tel) =>
    tel === "111"
      ? { ok: true, data: { error: "Wrong phone number" } }
      : tel === "222"
        ? { ok: false, msg: "timeout" }
        : { ok: true, data: { sent: "true" } };
  const s = silenciar();
  const r = await cron.enviarMensajeMembresiaPorFinalizar1diaAntes();
  s.restaurar();

  assert.deepEqual({ enviados: r.enviados, errores: r.errores }, { enviados: 1, errores: 2 });
  const estado = (tel) => [...registros.values()].find((x) => x.telefono === tel);
  assert.equal(estado("111").estado, "error");
  assert.match(estado("111").detalle, /Wrong phone number/);
  assert.equal(estado("222").detalle, "timeout");
  assert.equal(estado("333").estado, "enviado");
  // El log identifica al cliente correcto
  assert.ok(s.errores.some((e) => /id_cli=1 tel=111/.test(e)));
  assert.ok(s.errores.some((e) => /id_cli=2 tel=222/.test(e)));
});

test("calcula el día de vencimiento en hora de Perú", () => {
  // 28/09 16:30 en Lima (21:30 UTC): 1 día -> 29/09, 1 semana -> 05/10
  const ahora = new Date("2026-09-28T21:30:00Z");
  const unDia = cron.calcularRangoDiaObjetivo(1, "dia", ahora);
  assert.equal(unDia.dia, "2026-09-29");
  assert.equal(unDia.inicio.toISOString(), "2026-09-29T05:00:00.000Z");
  assert.equal(unDia.fin.toISOString(), "2026-09-30T05:00:00.000Z");
  assert.equal(cron.calcularRangoDiaObjetivo(1, "semana", ahora).dia, "2026-10-05");

  // 28/09 23:30 en Lima (ya 29/09 en UTC): sigue siendo el 28 en Perú
  assert.equal(cron.calcularRangoDiaObjetivo(1, "dia", new Date("2026-09-29T04:30:00Z")).dia, "2026-09-29");
  assert.throws(() => cron.calcularRangoDiaObjetivo(1, "hora"), /inválido/);
});

test("busca solo seguimientos activos que vencen ese día", async () => {
  const { Op } = require("sequelize");
  await cron.obtenerDestinatarios(1, "dia", new Date("2026-09-28T21:30:00Z"));
  assert.equal(ultimoWhereSeguimientos.flag, true);
  assert.equal(ultimoWhereSeguimientos.fecha_vencimiento[Op.gte].toISOString(), "2026-09-29T05:00:00.000Z");
  assert.equal(ultimoWhereSeguimientos.fecha_vencimiento[Op.lt].toISOString(), "2026-09-30T05:00:00.000Z");
});

test("un error de base de datos no lanza excepción (no tumba el cron)", async () => {
  const original = require.cache[path.resolve(__dirname, "../models/Seguimientos.js")].exports.Seguimiento.findAll;
  require.cache[path.resolve(__dirname, "../models/Seguimientos.js")].exports.Seguimiento.findAll = async () => {
    throw new Error("BD caída");
  };
  const s = silenciar();
  const r = await cron.enviarMensajeMembresiaPorFinalizar1diaAntes();
  s.restaurar();
  require.cache[path.resolve(__dirname, "../models/Seguimientos.js")].exports.Seguimiento.findAll = original;

  assert.equal(r.error, "BD caída");
  assert.equal(enviados.length, 0);
});
