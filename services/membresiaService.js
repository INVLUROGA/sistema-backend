// services/membresiaService.js
// Cambio de la fecha de inicio de una membresía vendida: actualiza la venta
// (detalle_ventaMembresia) y recalcula su seguimiento (tb_seguimiento).
const { SemanasTraining } = require("../models/ProgramaTraining");
const { Venta, detalleVenta_membresias } = require("../models/Venta");
const { Seguimiento } = require("../models/Seguimientos");
const {
  obtenerDataSeguimientoPorVenta,
} = require("../middlewares/EventosCron/obtenerDataSeguimientos");
const { capturarAUDIT } = require("../middlewares/auditoria");
const { typesCRUD } = require("../types/types");

// El seguimiento solo se calcula para las ventas de Change (ver calcularDataSeguimientos)
const EMPRESA_CON_SEGUIMIENTO = 598;

// "YYYY-MM-DD" válido (rechaza fechas inexistentes como 2026-02-30)
function esFechaValida(texto) {
  if (typeof texto !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const fecha = new Date(`${texto}T00:00:00Z`);
  return !isNaN(fecha) && fecha.toISOString().slice(0, 10) === texto;
}

// Fecha de fin: inicio + semanas del plan * 7 días (igual que al crear la venta)
function calcularFechaFin(fechaInicio, semanas) {
  const fin = new Date(`${fechaInicio}T00:00:00Z`);
  fin.setUTCDate(fin.getUTCDate() + Number(semanas) * 7);
  return fin.toISOString().slice(0, 10);
}

// Fecha guardada -> "YYYY-MM-DD" (para mostrar el valor anterior en la auditoría)
const soloFecha = (valor) => {
  if (!valor) return null;
  const fecha = new Date(valor);
  return isNaN(fecha) ? String(valor) : fecha.toISOString().slice(0, 10);
};

/// Cambia la fecha de inicio de la membresía y recalcula su seguimiento.
/// Si el seguimiento no se puede recalcular, la venta vuelve a su fecha anterior.
/// Retorna { ok, status, msg, membresia, fecha_vencimiento }.
async function cambiarFechaInicio(idMembresiaTexto, fechaInicio, usuario = {}) {
  const idMembresia = Number(idMembresiaTexto);
  if (!Number.isInteger(idMembresia) || idMembresia <= 0) {
    return { ok: false, status: 400, msg: "La membresía no es válida" };
  }
  if (!esFechaValida(fechaInicio)) {
    return { ok: false, status: 400, msg: "La fecha de inicio debe tener el formato YYYY-MM-DD" };
  }

  const membresia = await detalleVenta_membresias.findOne({
    where: { id: idMembresia, flag: true },
    include: [
      { model: SemanasTraining, attributes: ["semanas_st"] },
      { model: Venta, attributes: ["id", "id_empresa", "flag"] },
    ],
  });
  if (!membresia || !membresia.tb_ventum || membresia.tb_ventum.flag === false) {
    return { ok: false, status: 404, msg: `No existe la membresía ${idMembresia}` };
  }
  const semanas = membresia.tb_semana_training?.semanas_st;
  if (!semanas) {
    return { ok: false, status: 409, msg: "La membresía no tiene semanas definidas; no se puede calcular su fin" };
  }

  const anterior = {
    fecha_inicio: membresia.fecha_inicio,
    fec_inicio_mem: membresia.fec_inicio_mem,
    fec_fin_mem: membresia.fec_fin_mem,
  };
  const fecFinMem = calcularFechaFin(fechaInicio, semanas);
  await membresia.update({
    fecha_inicio: fechaInicio,
    fec_inicio_mem: fechaInicio,
    fec_fin_mem: fecFinMem,
  });

  let fechaVencimiento = null;
  if (membresia.tb_ventum.id_empresa === EMPRESA_CON_SEGUIMIENTO) {
    const recalculado = await obtenerDataSeguimientoPorVenta(membresia.id_venta);
    if (!recalculado) {
      await membresia.update(anterior); // venta y seguimiento no deben quedar distintos
      return {
        ok: false,
        status: 500,
        msg: "No se pudo actualizar el seguimiento; la fecha de inicio no se cambió",
      };
    }
    const seguimiento = await Seguimiento.findOne({
      where: { id_membresia: idMembresia },
      attributes: ["fecha_vencimiento"],
    });
    fechaVencimiento = seguimiento?.fecha_vencimiento ?? null;
  }

  await capturarAUDIT({
    id_user: usuario.id_user,
    ip_user: usuario.ip_user,
    accion: typesCRUD.PUT,
    observacion:
      `Se cambió la fecha de inicio de la membresía ${idMembresia} (venta ${membresia.id_venta}): ` +
      `${soloFecha(anterior.fecha_inicio)} -> ${fechaInicio} (fin ${fecFinMem})`,
  });

  return {
    ok: true,
    status: 200,
    msg: "Fecha de inicio actualizada",
    membresia: {
      id: idMembresia,
      id_venta: membresia.id_venta,
      fec_inicio_mem: fechaInicio,
      fec_fin_mem: fecFinMem,
    },
    fecha_vencimiento: fechaVencimiento,
  };
}

module.exports = {
  esFechaValida,
  calcularFechaFin,
  cambiarFechaInicio,
};
