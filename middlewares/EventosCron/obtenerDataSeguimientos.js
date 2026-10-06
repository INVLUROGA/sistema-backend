const { Cita } = require("../../models/Cita");
const { ExtensionMembresia } = require("../../models/ExtensionMembresia");
const { SemanasTraining } = require("../../models/ProgramaTraining");
const { Seguimiento } = require("../../models/Seguimientos");
const {
  Venta,
  detalleVenta_membresias,
  detalleVenta_Transferencia,
} = require("../../models/Venta");

// El server corre en UTC y Perú es UTC-5 todo el año (no tiene horario de
// verano). fecha_inicio/fecha_venta se guardan como el instante real (UTC) en
// que ocurrió la acción, así que para contar "días" en el calendario de Perú
// hay que pasar ese instante a hora Perú (restar 5h) antes de leer/mutar el
// día con los getters/setters UTC*(). Si no se hace, una venta registrada
// entre ~7pm y medianoche hora Perú (que en UTC ya cae en el día siguiente)
// arranca a contar desde el día equivocado.
const OFFSET_PERU_MS = 5 * 60 * 60 * 1000;
const obtenerFechaPeru = (fecha = new Date()) =>
  new Date(new Date(fecha).getTime() - OFFSET_PERU_MS);

const sumarDias = (fecha, numero, contarFinDeSemana = true) => {
  const result = obtenerFechaPeru(fecha);
  let diasAgregados = 0;

  while (diasAgregados < numero) {
    result.setUTCDate(result.getUTCDate() + 1);

    if (!contarFinDeSemana) {
      const dia = result.getUTCDay(); // 0 domingo, 6 sábado
      if (dia === 0 || dia === 6) continue;
    }

    diasAgregados++;
  }

  // devolvemos el instante UTC real (revertimos el ajuste a hora Perú)
  return new Date(result.getTime() + OFFSET_PERU_MS);
};
const contarDiasIncluyendoInicio = (fechaInicio, fechaFin) => {
  const inicio = obtenerFechaPeru(fechaInicio);
  const fin = obtenerFechaPeru(fechaFin);

  inicio.setUTCHours(0, 0, 0, 0);
  fin.setUTCHours(0, 0, 0, 0);

  return Math.floor((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
};

// Dias de calendario de una extension, de extension_inicio a extension_fin
// (ambos incluidos). Si no tiene un rango valido, usa dias_habiles.
// extension_inicio/extension_fin son strings: si traen "YYYY-MM-DD" se usa solo
// esa fecha (sin hora) para no correr un dia por la zona horaria.
const parsearFechaExtension = (valor) => {
  if (!valor) return null;
  const match = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const fecha = match
    ? new Date(Date.UTC(match[1], match[2] - 1, match[3]))
    : new Date(valor);
  return isNaN(fecha) ? null : fecha;
};
const diasExtension = (ext) => {
  const inicio = parsearFechaExtension(ext?.extension_inicio);
  const fin = parsearFechaExtension(ext?.extension_fin);
  if (inicio && fin && fin >= inicio) {
    return contarDiasIncluyendoInicio(inicio, fin);
  }
  return Number(ext?.dias_habiles || 0);
};

// status_cita de una cita a la que el cliente asistio (502 = no asistio)
const CITA_ASISTIDA = 501;

// Calcula la data de seguimiento. Si se pasa idVenta, solo procesa la
// membresia de esa venta (usado al crear/editar una extension).
const calcularDataSeguimientos = async (idVenta = null) => {
    const whereVenta = { flag: true, id_empresa: 598 };
    if (idVenta) whereVenta.id = idVenta;
    // MAPEAR MEMBRESIAS CON VENTAS, TRANSFERENCIAS CON MEMBRESIAS Y VENTAS
    //EXTRAER MEMBRESIAS
    const ventasMembresias = await Venta.findAll({
      where: whereVenta,
      attributes: ["id_cli", "id_empl", "observacion"],
      include: [
        {
          model: detalleVenta_membresias,
          attributes: [
            "id",
            "id_venta",
            "id_tarifa",
            "id_pgm",
            "id_st",
            "fecha_inicio",
          ],
          required: true,
          include: [
            {
              model: SemanasTraining,
              attributes: ["semanas_st", "sesiones", "id_st"],
            },
          ],
        },
      ],
      order: [
        ["id", "desc"],
        ["id_cli", "desc"],
      ],
    });
    const VentasMembresias = ventasMembresias.map((v) =>
      v.get({ plain: true }),
    );

    //TRANSFERENCIAS
    const ventasTransferencias = await Venta.findAll({
      where: { flag: true, id_empresa: 598 },
      attributes: ["id", "id_cli", "id_empl", "observacion"],
      include: [
        {
          model: detalleVenta_Transferencia,
          as: "venta_venta",
          required: true,
          ...(idVenta && { where: { id_membresia: idVenta } }),
          attributes: [
            "id",
            "id_venta",
            "id_membresia",
            "horario",
            "fec_inicio_mem",
            "fec_fin_mem",
            "fecha_inicio",
          ],
          include: [
            {
              model: Venta,
              as: "venta_transferencia",
              attributes: ["id", "id_cli", "id_empl", "observacion"],
            },
          ],
        },
      ],
      // la transferencia mas reciente primero, para que [0] sea el id_cli actual
      order: [["id", "desc"]],
    });

    const VentasTransferencias = ventasTransferencias.map((v) =>
      v.get({ plain: true }),
    );

    // EXTRAER CONGELAMIENTOS, AUMENTO DEPENDIENDO DEL INICIO Y FIN DE LA EXTENSION: AUMENTAR DIAS, LOS DIAS DE CONGELAMIENTOS SE REFLEJAN EN EL INICIO Y FIN DE LA EXTENSION
    const dataCongelamientos = await ExtensionMembresia.findAll({
      where: {
        tipo_extension: "CON",
        flag: true,
        ...(idVenta && { id_venta: idVenta }),
      },
      attributes: [
        "tipo_extension",
        "extension_inicio",
        "extension_fin",
        "dias_habiles",
        "id_venta",
      ],
    });
    // EXTRAER REGALOS, AUMENTO DEPENDIENDO DEL INICIO Y FIN DE LA EXTENSION: AUMENTAR DIAS. LOS DIAS DE REGALO SE REFLEJAN EN LOS ULTIMOS DIAS
    const dataRegalos = await ExtensionMembresia.findAll({
      where: {
        tipo_extension: "REG",
        flag: true,
        ...(idVenta && { id_venta: idVenta }),
      },
      attributes: [
        "tipo_extension",
        "extension_inicio",
        "extension_fin",
        "dias_habiles",
        "id_venta",
      ],
    });
    const ventasMembresiasConTransferencias = VentasMembresias.map((v) => {
      const det = v.detalle_ventaMembresia?.[0] ?? null;

      const membresia = {
        id_cli: v.id_cli,
        id_empl: v.id_empl,
        observacion: v.observacion,
        // dias de la membresia (lunes a domingo): semanas del plan * 7
        dias_membresia: det?.tb_semana_training?.semanas_st
          ? Number(det.tb_semana_training.semanas_st) * 7
          : null,
        id_membresia: det?.id ?? null,
        id_tarifa: det?.id_tarifa ?? null,
        id_st: det?.id_st ?? null,
        fecha_inicio: det?.fecha_inicio ?? null,
        id_pgm: det?.id_pgm ?? null,
        id_venta: det?.id_venta ?? null,
      };

      // Si no hay detalle o no hay id_venta, igual devolvemos algo consistente
      if (
        !membresia.id_venta ||
        !membresia.fecha_inicio ||
        !membresia.dias_membresia
      ) {
        return {
          ...membresia,
          fecha_vencimiento: null,
          sesiones_pendientes: 0,
          cantCongelamiento: 0,
          cantRegalos: 0,
        };
      }

      // 🔁 Transferencias asociadas a esta membresía (mantengo tu misma lógica)
      const transferenciasxIdMembresia = VentasTransferencias.filter(
        (t) => t?.venta_venta?.[0]?.id_membresia === membresia.id_venta,
      );

      // 🎁 Extensiones
      const regalosxIdMembresia = dataRegalos.filter(
        (reg) => reg?.id_venta === membresia.id_venta,
      );
      const congelamientosxIdMembresia = dataCongelamientos.filter(
        (cong) => cong?.id_venta === membresia.id_venta,
      );
      const cantCongelamiento = congelamientosxIdMembresia.reduce(
        (acc, item) => acc + diasExtension(item),
        0,
      );
      const cantRegalos = regalosxIdMembresia.reduce(
        (acc, item) => acc + diasExtension(item),
        0,
      );

      const fecha_vencimiento = sumarDias(
        membresia.fecha_inicio,
        cantCongelamiento + cantRegalos + membresia.dias_membresia,
        true, // lunes a domingo: cuenta todos los dias
      );

      return {
        ...membresia,
        // si existe transferencia, usas el id_cli del registro de transferencia (como tú ya hacías)
        id_cli:
          transferenciasxIdMembresia.length <= 0
            ? membresia.id_cli
            : transferenciasxIdMembresia[0].id_cli,

        fecha_vencimiento,
        sesiones_pendientes: contarDiasIncluyendoInicio(
          new Date(),
          fecha_vencimiento,
        ),
        cantCongelamiento,
        cantRegalos,
      };
    });

    // CITAS CON NUTRICIONISTA: citas asistidas (status_cita 501) del cliente
    // dentro del periodo de la membresia (fecha_inicio a fecha_vencimiento)
    const idsCli = [
      ...new Set(
        ventasMembresiasConTransferencias.map((seg) => seg.id_cli).filter(Boolean),
      ),
    ];
    const dataCitas =
      idsCli.length === 0
        ? []
        : await Cita.findAll({
            where: {
              status_cita: CITA_ASISTIDA,
              flag: true,
              ...(idVenta && { id_cli: idsCli }),
            },
            attributes: ["id_cli", "fecha_init"],
            raw: true,
          });
    const contarCitasNutricionista = (seg) => {
      if (!seg.fecha_inicio || !seg.fecha_vencimiento) return 0;
      const inicio = new Date(seg.fecha_inicio);
      const fin = new Date(seg.fecha_vencimiento);
      return dataCitas.filter((cita) => {
        const fecha = new Date(cita.fecha_init);
        return cita.id_cli === seg.id_cli && fecha >= inicio && fecha <= fin;
      }).length;
    };

    return ventasMembresiasConTransferencias.map((seg) => {
      return {
        id_cli: seg.id_cli,
        id_membresia: seg.id_membresia,
        id_cambio: 0,
        id_extension: 0,
        sesiones_pendientes: 0,
        fecha_vencimiento: seg.fecha_vencimiento,
        // dias de las extensiones CON de la venta
        dias_congelamientos_usados: seg.cantCongelamiento ?? 0,
        citas_nutricionista_usadas: contarCitasNutricionista(seg),
        status_periodo: "",
        flag: true,
      };
    });
};

const obtenerDataSeguimientos = async () => {
  try {
    const dataSeguimiento = await calcularDataSeguimientos();
    console.log({ dataSeguimiento }, "SEGUIMIENTOSSSS");

    await Seguimiento.bulkCreate(dataSeguimiento);
    return true;
    // EXTRAER CAMBIO DE MEMBRESIA
  } catch (error) {
    console.log(error);
  }
};

// Mismo procedimiento que obtenerDataSeguimientos, pero solo para la venta
// indicada: reemplaza sus registros en tb_seguimiento.
const obtenerDataSeguimientoPorVenta = async (idVenta) => {
  try {
    if (!idVenta) return false;
    const dataSeguimiento = await calcularDataSeguimientos(Number(idVenta));
    const idsMembresia = dataSeguimiento
      .map((seg) => seg.id_membresia)
      .filter(Boolean);
    if (idsMembresia.length === 0) return false;

    await Seguimiento.destroy({ where: { id_membresia: idsMembresia } });
    await Seguimiento.bulkCreate(dataSeguimiento);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

// Al registrar una transferencia, cambia el id_cli del seguimiento de la
// membresia transferida (id_membresia de la transferencia = id de la venta
// original). Solo modifica tb_seguimiento.
const actualizarClienteSeguimientoPorTransferencia = async (
  idVentaMembresia,
  idCliNuevo,
) => {
  try {
    if (!idVentaMembresia || !idCliNuevo) return false;
    const membresias = await detalleVenta_membresias.findAll({
      where: { id_venta: idVentaMembresia },
      attributes: ["id"],
      raw: true,
    });
    const idsMembresia = membresias.map((m) => m.id);
    if (idsMembresia.length === 0) return false;

    await Seguimiento.update(
      { id_cli: idCliNuevo },
      { where: { id_membresia: idsMembresia } },
    );
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

// Al crear/editar/eliminar una cita, recalcula los seguimientos del cliente
// (citas_nutricionista_usadas depende de sus citas asistidas).
const recalcularSeguimientosPorCliente = async (idCli) => {
  try {
    if (!idCli) return false;
    const seguimientos = await Seguimiento.findAll({
      where: { id_cli: idCli },
      attributes: ["id_membresia"],
      raw: true,
    });
    const idsMembresia = seguimientos.map((s) => s.id_membresia).filter(Boolean);
    if (idsMembresia.length === 0) return false;
    const membresias = await detalleVenta_membresias.findAll({
      where: { id: idsMembresia },
      attributes: ["id_venta"],
      raw: true,
    });
    const idsVenta = [...new Set(membresias.map((m) => m.id_venta))];
    for (const idVenta of idsVenta) {
      await obtenerDataSeguimientoPorVenta(idVenta);
    }
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

module.exports = {
  obtenerDataSeguimientos,
  obtenerDataSeguimientoPorVenta,
  recalcularSeguimientosPorCliente,
  actualizarClienteSeguimientoPorTransferencia,
};
