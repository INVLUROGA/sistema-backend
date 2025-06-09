const { Sequelize, Op } = require("sequelize");
const { Cita, eventoServicio } = require("../models/Cita");
const { Cliente, Empleado } = require("../models/Usuarios");
const { detalleVenta_citas } = require("../models/Venta");
const { Servicios } = require("../models/Servicios");
const { request, response } = require("express");
const { enviarMensajesWsp } = require("../config/whatssap-web");
const dayjs = require("dayjs");
const es = require("dayjs/locale/es");
const { capturarAccion } = require("../middlewares/auditoria");
const { typesCRUD } = require("../types/types");
const { EtiquetasxIds, Parametros } = require("../models/Parametros");
const { ServiciosCircus } = require("../models/modelsCircus/Servicios");
dayjs.locale("es"); // Establece el idioma en español

const getServiciosCita = async (req, res) => {
  const { id_empresa } = req.params;
  const { fecha_inicio } = req.query;
  console.log({ fecha_inicio });

  try {
    // Parseamos la fecha y armamos el rango [startDay, nextDay)
    const startDay = new Date(fecha_inicio);
    startDay.setHours(0, 0, 0, 0);

    const nextDay = new Date(startDay);
    nextDay.setDate(nextDay.getDate() + 1);
    const citas = await eventoServicio.findAll({
      where: {
        flag: true,
        // id_empresa, // si también quieres filtrar por empresa
        fecha_inicio: {
          [Op.gte]: startDay, // >= 2025-05-29 00:00:00.000
          [Op.lt]: nextDay, // <  2025-05-30 00:00:00.000
        },
      },
      include: [
        {
          model: Empleado,
        },
        {
          model: Cliente,
        },
        {
          model: EtiquetasxIds,
          include: [
            {
              model: ServiciosCircus,
              as: "parametro_servicio",
            },
          ],
        },
      ],
    });

    res.status(200).json(citas);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const postServiciosCita = async (req = request, res = response) => {
  try {
    const cita = new eventoServicio(req.body);
    await cita.save();
    res.status(200).json(cita);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};

const getCitasxServ = async (req = request, res = response) => {
  const { id_empresa } = req.params;
  try {
    const citas = await Cita.findAll({
      where: { flag: true },
      attributes: ["id", "id_cli", "fecha_init", "fecha_final", "status_cita"],
      include: [
        {
          model: Cliente,
          attributes: [
            [
              Sequelize.fn(
                "CONCAT",
                Sequelize.col("nombre_cli"),
                " ",
                Sequelize.col("apPaterno_cli"),
                " ",
                Sequelize.col("apMaterno_cli")
              ),
              "nombres_apellidos_cli",
            ],
          ],
        },
        {
          model: Empleado,
          attributes: [
            [
              Sequelize.fn(
                "CONCAT",
                Sequelize.col("nombre_empl"),
                " ",
                Sequelize.col("apPaterno_empl"),
                " ",
                Sequelize.col("apMaterno_empl")
              ),
              "nombres_apellidos_empl",
            ],
          ],
          where: { id_empresa: id_empresa },
        },
      ],
    });
    res.status(200).json({
      ok: true,
      citas,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};

const postCita = async (req = request, res = response) => {
  const {
    id_cli,
    id_cita_adquirida,
    fecha_init,
    fecha_final,
    status_cita,
    id_empl,
  } = req.body;
  try {
    const cita = new Cita({
      id_cli,
      id_cita_adquirida,
      fecha_init,
      fecha_final,
      status_cita,
      id_empl,
    });
    let formAUDIT2 = {
      id_user: req.id_user,
      ip_user: req.ip_user,
      accion: typesCRUD.POST,
      arrayNuevo: {
        ...req.body,
      },
      arrayViejo: {
        ...req.body,
      },
      observacion: `Se agrego: El Cita de id ${cita.id}`,
    };
    await capturarAccion(formAUDIT2);
    await cita.save();
    const cliente = await Cliente.findOne({ where: { id_cli: id_cli } });
    const objSexoTst = {
      masculino: 8,
      fem: 9,
    };
    const dateCita = new Date(fecha_init).toLocaleDateString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const dayjsTest = dayjs
      .utc(fecha_init)
      .subtract(5, "hours")
      .local(es)
      .format("dddd DD [de] MMMM [a las ] hh:mm A");

    if (cliente.tel_cli.length > 0) {
      await enviarMensajesWsp(
        cliente.tel_cli,
        `¡Hola ${cliente.nombre_cli.toUpperCase()}! 👋🏻🙂 
Te confirmamos que tu cita con la nutricionista en CHANGE THE SLIM STUDIO está programada para el día *${dayjsTest}*. 

Es muy importante que llegues 10 minutos antes, estés en ayunas o al menos 3 horas después de tu última comida, y que no realices actividad física previa a la cita, para garantizar una evaluación precisa.

¡BIENVENIDA AL CAMBIO!  ¡${
          cliente.sexo_cli === objSexoTst.fem
            ? "BIENVENIDA"
            : cliente.sexo_cli === 0
            ? "BIENVENID(a)"
            : "BIENVENIDO"
        } AL CHANGE!💪✨
`
      );
    }
    res.status(200).json({
      ok: true,
      cita,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador, problema en post cita",
    });
  }
};

const getCitaporID = async (req = request, res = response) => {
  const { id } = req.params;
  try {
    const cita = await Cita.findOne({ where: { flag: true, id } });

    res.status(200).json({
      ok: true,
      cita,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador: getCitaporID",
    });
  }
};

const deleteCita = async (req = request, res = response) => {
  const { id } = req.params;
  try {
    const cita = await Cita.findOne({ where: { flag: true, id } });

    await cita.update({ flag: false });
    res.status(200).json({
      ok: true,
      cita,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador: putCita",
    });
  }
};

const putCita = async (req = request, res = response) => {
  const { id } = req.params;
  const { fecha_init, isUpdateTime } = req.body;
  try {
    const cita = await Cita.findOne({ where: { flag: true, id } });
    await cita.update(req.body);
    const cliente = await Cliente.findOne({ where: { id_cli: cita.id_cli } });
    if (isUpdateTime) {
      const dayjsTest = dayjs
        .utc(fecha_init)
        .subtract(5, "hours")
        .local(es)
        .format("dddd DD [de] MMMM [a las ] hh:mm A");

      enviarMensajesWsp(
        cliente.tel_cli,
        `
        Hola ${cliente.nombre_cli.toUpperCase()}!
        A tu solicitud, reprogramamos tu cita con Nutrición para el ${dayjsTest} en CHANGE ✅

      Gracias por avisarnos con anticipación.
      Esta cita es clave para analizar cómo está tu cuerpo por dentro, entender tus hábitos y armar el plan que realmente funcione contigo.

      Recuerda llegar 15 min antes y en ayunas (o mínimo 3h sin comer).
      ¡Nos vemos pronto!
              `
      );
    }
    if (req.body.status_cita === "502") {
      const dayjsTest = dayjs
        .utc(fecha_init)
        .subtract(5, "hours")
        .local(es)
        .format("dddd DD [de] MMMM [a las ] hh:mm A");
      enviarMensajesWsp(
        cliente.tel_cli,
        `
        Hola ${cliente.nombre_cli.toUpperCase()}!,

Lamentamos que no hayas podido asistir a tu cita de evaluación nutricional en CHANGE. Sabemos que a veces surgen imprevistos, pero queremos recordarte que el 70% del resultado te lo dará la DIETA y que este seguimiento con nosotros es clave para lograr tus objetivos de salud y bienestar.

Te invitamos a reagendar tu cita lo antes posible. Estamos aquí para apoyarte en cada paso del camino al CAMBIO!
              `
      );
    }
    console.log(cita, req.body);

    res.status(200).json({
      ok: true,
      cita,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador: putCita",
    });
  }
};

const getCitasxServicios = async (req = request, res = response) => {
  const { tipo_serv } = req.params;
  try {
    const citas = await Cita.findAll({
      where: { flag: true },
      order: [["fecha_init", "desc"]],
      attributes: ["id", "id_cli", "fecha_init", "fecha_final", "status_cita"],
      include: [
        {
          model: Cliente,
          attributes: [
            [
              Sequelize.fn(
                "CONCAT",
                Sequelize.col("nombre_cli"),
                " ",
                Sequelize.col("apPaterno_cli"),
                " ",
                Sequelize.col("apMaterno_cli")
              ),
              "nombres_apellidos_cli",
            ],
          ],
        },
      ],
    });
    res.status(200).json({
      ok: true,
      citas,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador: getCitasxServicios",
    });
  }
};
const getCitasxServiciosFilter = async (req = request, res = response) => {
  const { status_cita, id_cli, id_empl } = req.body;
  const { tipo_serv } = req.params;

  try {
    let where = { flag: true };

    // Validar si hay filtros activos
    const hasFilters =
      (status_cita && status_cita !== 0) ||
      (id_cli && id_cli !== 0) ||
      (id_empl && id_empl !== 0);
    // ||(arrayDate && Array.isArray(arrayDate) && arrayDate.length === 2);

    if (hasFilters) {
      if (status_cita && status_cita !== 0) where.status_cita = status_cita;
      if (id_cli && id_cli !== 0) where.id_cli = id_cli;
      if (id_empl && id_empl !== 0) where.id_empl = id_empl;

      // Validar y aplicar filtro de fecha
      // if (arrayDate && Array.isArray(arrayDate) && arrayDate.length === 2) {
      //   const [startDate, endDate] = arrayDate;
      //   where.fecha_init = { [Op.between]: [startDate, endDate] };
      // }
    }

    // Obtener citas con o sin filtros
    const citas = await Cita.findAll({
      where,
      order: [["fecha_init", "desc"]],
      attributes: [
        "id",
        "id_cli",
        "id_empl",
        "fecha_init",
        "fecha_final",
        "status_cita",
      ],
      include: [
        {
          model: Cliente,
          attributes: [
            [
              Sequelize.fn(
                "CONCAT",
                Sequelize.col("nombre_cli"),
                " ",
                Sequelize.col("apPaterno_cli"),
                " ",
                Sequelize.col("apMaterno_cli")
              ),
              "nombres_apellidos_cli",
            ],
          ],
        },
        {
          model: Empleado,
          attributes: [
            [
              Sequelize.fn(
                "CONCAT",
                Sequelize.col("nombre_empl"),
                " ",
                Sequelize.col("apPaterno_empl"),
                " ",
                Sequelize.col("apMaterno_empl")
              ),
              "nombres_apellidos_empl",
            ],
          ],
        },
      ],
    });

    res.status(200).json({ ok: true, citas });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador: getCitasxServicios",
    });
  }
};
module.exports = {
  postCita,
  getCitaporID,
  deleteCita,
  putCita,
  getCitasxServicios,
  getCitasxServiciosFilter,
  getCitasxServ,
  postServiciosCita,
  getServiciosCita,
};
