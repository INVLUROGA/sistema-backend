// Tests de PUT /api/venta/membresia/:id/fecha-inicio: cambia la fecha de inicio en la venta
// (detalle_ventaMembresia) y recalcula el seguimiento; si el seguimiento falla, revierte la venta.
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// --- Dobles de prueba ---
let membresia, recalcularOk, recalculadas, auditorias, seguimientoGuardado;
const stub = (ruta, exports) => {
  const r = path.resolve(__dirname, ruta);
  require.cache[r] = { id: r, filename: r, loaded: true, exports };
};
stub("../models/ProgramaTraining.js", { SemanasTraining: {} });
stub("../models/Venta.js", {
  Venta: {},
  detalleVenta_membresias: {
    async findOne({ where }) {
      return membresia && membresia.id === where.id ? membresia : null;
    },
  },
});
stub("../models/Seguimientos.js", {
  Seguimiento: {
    async findOne() {
      return seguimientoGuardado;
    },
  },
});
stub("../middlewares/EventosCron/obtenerDataSeguimientos.js", {
  async obtenerDataSeguimientoPorVenta(idVenta) {
    recalculadas.push({ idVenta, fecha_inicio: membresia.fecha_inicio });
    return recalcularOk;
  },
});
stub("../middlewares/auditoria.js", {
  async capturarAUDIT(form) {
    auditorias.push(form);
  },
});

const { cambiarFechaInicio, calcularFechaFin, esFechaValida } = require("../services/membresiaService");

beforeEach(() => {
  membresia = {
    id: 12113,
    id_venta: 18244,
    fecha_inicio: new Date("2026-10-05T00:00:00Z"),
    fec_inicio_mem: new Date("2026-10-05T00:00:00Z"),
    fec_fin_mem: "2026-12-28",
    tb_semana_training: { semanas_st: 12 },
    tb_ventum: { id: 18244, id_empresa: 598, flag: true },
    async update(cambios) {
      Object.assign(this, cambios);
    },
  };
  recalcularOk = true;
  recalculadas = [];
  auditorias = [];
  seguimientoGuardado = { fecha_vencimiento: new Date("2026-12-31T00:00:00Z") };
});

test("cambia inicio y fin en la venta y recalcula el seguimiento con la nueva fecha", async () => {
  const r = await cambiarFechaInicio("12113", "2026-10-08", { id_user: 7, ip_user: "1.1.1.1" });

  assert.equal(r.status, 200);
  assert.equal(membresia.fecha_inicio, "2026-10-08");
  assert.equal(membresia.fec_inicio_mem, "2026-10-08");
  assert.equal(membresia.fec_fin_mem, "2026-12-31"); // 12 semanas = 84 días
  // El seguimiento se recalculó DESPUÉS de guardar la nueva fecha
  assert.deepEqual(recalculadas, [{ idVenta: 18244, fecha_inicio: "2026-10-08" }]);
  assert.deepEqual(r.membresia, { id: 12113, id_venta: 18244, fec_inicio_mem: "2026-10-08", fec_fin_mem: "2026-12-31" });
  assert.deepEqual(r.fecha_vencimiento, new Date("2026-12-31T00:00:00Z"));

  // Queda en la auditoría con el valor anterior y el nuevo
  assert.equal(auditorias.length, 1);
  assert.equal(auditorias[0].id_user, 7);
  assert.equal(auditorias[0].accion, 2); // PUT
  assert.match(auditorias[0].observacion, /membresía 12113 \(venta 18244\): 2026-10-05 -> 2026-10-08 \(fin 2026-12-31\)/);
});

test("si el seguimiento no se puede recalcular, la venta vuelve a su fecha anterior", async () => {
  recalcularOk = false;
  const r = await cambiarFechaInicio("12113", "2026-10-08");

  assert.equal(r.status, 500);
  assert.deepEqual(membresia.fecha_inicio, new Date("2026-10-05T00:00:00Z"));
  assert.equal(membresia.fec_fin_mem, "2026-12-28");
  assert.equal(auditorias.length, 0);
});

test("ventas de otras empresas (sin seguimiento): solo cambia la venta", async () => {
  membresia.tb_ventum.id_empresa = 599;
  const r = await cambiarFechaInicio("12113", "2026-10-08");

  assert.equal(r.status, 200);
  assert.equal(membresia.fec_fin_mem, "2026-12-31");
  assert.equal(recalculadas.length, 0);
  assert.equal(r.fecha_vencimiento, null);
});

test("valida la fecha, la membresía y que tenga semanas", async () => {
  assert.equal((await cambiarFechaInicio("12113", "08/10/2026")).status, 400);
  assert.equal((await cambiarFechaInicio("12113", "2026-02-30")).status, 400);
  assert.equal((await cambiarFechaInicio("abc", "2026-10-08")).status, 400);
  assert.equal((await cambiarFechaInicio("999", "2026-10-08")).status, 404);
  membresia.tb_ventum.flag = false; // venta anulada
  assert.equal((await cambiarFechaInicio("12113", "2026-10-08")).status, 404);
  membresia.tb_ventum.flag = true;
  membresia.tb_semana_training = null;
  assert.equal((await cambiarFechaInicio("12113", "2026-10-08")).status, 409);
  assert.equal(recalculadas.length, 0);
});

test("calcularFechaFin y esFechaValida", () => {
  assert.equal(calcularFechaFin("2026-10-05", 12), "2026-12-28");
  assert.equal(calcularFechaFin("2026-12-28", 1), "2027-01-04"); // cruza de año
  assert.equal(esFechaValida("2028-02-29"), true); // año bisiesto
  assert.equal(esFechaValida("2026-02-29"), false);
});
