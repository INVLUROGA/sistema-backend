const { ExtensionMembresia } = require("../../models/ExtensionMembresia");
const { SemanasTraining } = require("../../models/ProgramaTraining");
const { Seguimiento } = require("../../models/Seguimientos");
const {
  Venta,
  detalleVenta_membresias,
  detalleVenta_Transferencia,
} = require("../../models/Venta");

const sumarDias = (fecha, numero, contarFinDeSemana = true) => {
  const result = new Date(fecha);
  let diasAgregados = 0;

  while (diasAgregados < numero) {
    result.setUTCDate(result.getUTCDate() + 1);

    if (!contarFinDeSemana) {
      const dia = result.getUTCDay(); // 0 domingo, 6 sábado
      if (dia === 0 || dia === 6) continue;
    }

    diasAgregados++;
  }

  return result; // o result.toISOString()
};
const contarDiasIncluyendoInicio = (fechaInicio, fechaFin) => {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  inicio.setHours(0, 0, 0, 0);
  fin.setHours(0, 0, 0, 0);

  return Math.floor((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
};

const obtenerDataSeguimientos = async () => {
  try {
    // MAPEAR MEMBRESIAS CON VENTAS, TRANSFERENCIAS CON MEMBRESIAS Y VENTAS
    //EXTRAER MEMBRESIAS
    const ventasMembresias = await Venta.findAll({
      where: { flag: true, id_empresa: 598 },
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
    });

    const VentasTransferencias = ventasTransferencias.map((v) =>
      v.get({ plain: true }),
    );

    // EXTRAER CONGELAMIENTOS, AUMENTO DEPENDIENDO DEL INICIO Y FIN DE LA EXTENSION: AUMENTAR DIAS, LOS DIAS DE CONGELAMIENTOS SE REFLEJAN EN EL INICIO Y FIN DE LA EXTENSION
    const dataCongelamientos = await ExtensionMembresia.findAll({
      where: { tipo_extension: "CON", flag: true },
      attributes: [
        "tipo_extension",
        "fecha_inicio",
        "fecha_fin",
        "tipo_extension",
        "dias_habiles",
        "id_venta",
      ],
    });
    // EXTRAER REGALOS, AUMENTO DEPENDIENDO DEL INICIO Y FIN DE LA EXTENSION: AUMENTAR DIAS. LOS DIAS DE REGALO SE REFLEJAN EN LOS ULTIMOS DIAS
    const dataRegalos = await ExtensionMembresia.findAll({
      where: { tipo_extension: "REG", flag: true },
      attributes: [
        "tipo_extension",
        "fecha_inicio",
        "fecha_fin",
        "tipo_extension",
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
        semanas: det?.tb_semana_training?.sesiones ?? null,
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
        !membresia.semanas
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
        (acc, item) => acc + Number(item.dias_habiles || 0),
        0,
      );
      const cantRegalos = regalosxIdMembresia.reduce(
        (acc, item) => acc + Number(item.dias_habiles || 0),
        0,
      );

      const fecha_vencimiento = sumarDias(
        membresia.fecha_inicio,
        cantCongelamiento + cantRegalos + membresia.semanas,
        false,
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
    const dataSeguimiento = ventasMembresiasConTransferencias.map((seg) => {
      return {
        id_cli: seg.id_cli,
        id_membresia: seg.id_membresia,
        id_cambio: 0,
        id_extension: 0,
        sesiones_pendientes: 0,
        fecha_vencimiento: seg.fecha_vencimiento,
        status_periodo: "",
        flag: true,
      };
    });
    await Seguimiento.bulkCreate(dataSeguimiento);
    console.log({
      ventasMembresiasConTransferencias,
    });
    return true;
    // EXTRAER CAMBIO DE MEMBRESIA
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  obtenerDataSeguimientos,
};
