
const recordatorioReservaCita24hAntes = async () => {
  try {
    console.log("Ejecutando recordatorio 24h antes...");
    const ahora = new Date();
    const en24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    const citas = await eventoServicio.findAll({
      where: {
        flag: true,
        id_empl: 3553,
      },
      include: [{ model: Cliente }, { model: Empleado }],
    });
    // Función para obtener solo la hora (en UTC o local)
    const obtenerHora = (fecha) => {
      const d = new Date(fecha);
      return d.getUTCHours(); // Usa getHours() si quieres hora local
    };

    const citasFiltradas = citas.filter(
      (cita) => obtenerHora(cita.fecha_inicio) === obtenerHora(en24h),
    );
    for (const cita of citasFiltradas) {
      const fecha_inicio = dayjs(cita.fecha_inicio).format(
        "dddd DD [de] MMMM [a las] hh:mm A",
      );
      // await enviarMensajesWsp__CIRCUS(
      //   cita.tb_cliente.tel_cli,
      //   messageWSP.mensaje24hAntesDeLaReserva(
      //     cita.tb_empleado,
      //     cita.tb_cliente,
      //     fecha_inicio,
      //   ),
      // );
      // await enviarMapaWsp__CIRCUS(
      //   cita.tb_cliente.tel_cli,
      //   "CIRCUS SALON",
      //   -12.133150008241682,
      //   -77.02314616701953,
      // );
    }
  } catch (error) {
    console.log(error);
  }
};
const recordatorioReservaCita2hAntes = async () => {
  try {
    console.log("Ejecutando recordatorio 2h antes...");
    const ahora = new Date();
    const en24h = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
    const citas = await eventoServicio.findAll({
      where: {
        flag: true,
        id_empl: 3553,
      },
      include: [{ model: Cliente }, { model: Empleado }],
    });
    // Función para obtener solo la hora (en UTC o local)
    const mismaFechaYHoraSinMinutos = (fecha1, fecha2) => {
      const f1 = new Date(fecha1);
      const f2 = new Date(fecha2);
      return (
        f1.getUTCFullYear() === f2.getUTCFullYear() &&
        f1.getUTCMonth() === f2.getUTCMonth() &&
        f1.getUTCDate() === f2.getUTCDate()
      );
    };
    const citasFiltradas = citas.filter((cita) =>
      mismaFechaYHoraSinMinutos(cita.fecha_inicio, en24h),
    );
    for (const cita of citasFiltradas) {
      const fecha_inicio = dayjs(cita.fecha_inicio).format(
        "dddd DD [de] MMMM [a las] hh:mm A",
      );
      // await enviarMensajesWsp__CIRCUS(
      //   cita.tb_cliente.tel_cli,
      //   messageWSP.mensaje2hAntesDeLaReserva(
      //     cita.tb_empleado,
      //     cita.tb_cliente,
      //     fecha_inicio,
      //   ),
      // );
    }
  } catch (error) {
    console.log(error);
  }
};