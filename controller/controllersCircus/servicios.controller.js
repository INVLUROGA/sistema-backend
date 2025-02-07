const { ServiciosCircus } = require("../../models/modelsCircus/Servicios");
const { Parametros } = require("../../models/Parametros");
const { Servicios } = require("../../models/Servicios");

const obtenerServiciosActivos = async (req, res) => {
  try {
    const servicios = await ServiciosCircus.findAll({
      include: [
        {
          model: Parametros,
        },
      ],
    });

    res.status(200).json({
      msg: "success",
      servicios,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: `Error en el servidor, en controller de postGasto, hable con el administrador: ${error}`,
    });
  }
};
module.exports = {
  obtenerServiciosActivos,
};
