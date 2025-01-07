const { Sequelize } = require("sequelize");
const { Cita } = require("../models/Cita");
const { Cliente, Empleado } = require("../models/Usuarios");
const { detalleVenta_citas } = require("../models/Venta");
const { Servicios } = require("../models/Servicios");
const { request, response } = require("express");
const { enviarMensajesWsp } = require("../config/whatssap-web");
const dayjs = require("dayjs");

const getCitas = async (req = request, res = response) => {
  const { servicion } = req.body;
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
        },
        {
          model: detalleVenta_citas,
          include: [
            {
              model: Servicios,
              attributes: ["id"],
            },
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
    await cita.save();
    const cliente = await Cliente.findOne({ where: { id_cli: id_cli } });
    // console.log(
    //   fecha_init,
    //   new Date(fecha_init).toLocaleDateString([], {
    //     hour: "2-digit",
    //     minute: "2-digit",
    //   }),
    //   dayjs.utc(fecha_init).format("DD/MM/YYYY"),
    //   dayjs.utc(fecha_init).format("hh:mm:ss"),
    //   "post en citasss....."
    // );

    if (cliente.tel_cli.length > 0) {
      await enviarMensajesWsp(
        933102718,
        `¡Hola ${
          cliente.nombre_cli
        }! Te confirmamos que tu cita está programada para el día ${new Date(
          fecha_init
        ).toLocaleDateString([])} a las ${new Date(
          fecha_init
        ).toLocaleDateString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}. Por favor, asegúrate de llegar a tiempo. ¡Te esperamos!`
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
  try {
    const cita = await Cita.findOne({ where: { flag: true, id } });
    await cita.update(req.body);
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
  // const { tipo_serv } = req.params;
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

module.exports = {
  getCitas,
  postCita,
  getCitaporID,
  deleteCita,
  putCita,
  getCitasxServicios,
};
