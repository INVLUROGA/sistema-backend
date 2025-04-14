// Ruta /bd/cmdqueue
const commandService = require("../../../services/commandService");
//services/commandService
// Controlador para manejar el POST en /bd/cmdqueue
exports.insertCMD = async (req, res) => {
  try {
    // Extraer los datos del cuerpo de la solicitud POST
    const { DeviceSN: DeviceSN, CMD: CMD } = req.body;

    // Verificar que se hayan enviado los parámetros necesarios
    if (!DeviceSN || !CMD) {
      return res.status(400).send("Faltan parámetros requeridos.");
    }

    // Llamar a la función del servicio para insertar el comando
    await commandService.insertCommand(DeviceSN, CMD);

    // Respuesta exitosa
    res
      .status(200)
      .send("Comando insertado correctamente en la tabla dbo.zk_QueueCMD");
  } catch (err) {
    console.error("Error al insertar en la base de datos", err);
    res.status(500).send("Error en el servidor");
  }
};

exports.getRecentCMD = async (req, res) => {
  try {
    const { device_sn } = req.query;

    if (!device_sn) {
      return res.status(400).send('El parámetro "device_sn" es requerido.');
    }

    const recentCommand = await commandService.getRecentCommandByDeviceSN(
      device_sn
    );

    if (recentCommand) {
      res.status(200).send({
        device_sn,
        id: recentCommand.id,
        recentCommand: recentCommand.cmd,
      });
    } else {
      res
        .status(404)
        .send(
          `No se encontró ningún comando para el dispositivo ${device_sn}.`
        );
    }
  } catch (err) {
    console.error("Error en la consulta del comando", err);
    res.status(500).send("Error en el servidor");
  }
};

// Controlador para manejar el DELETE en /bd/cmdqueue
exports.deleteCommandById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).send('El parámetro "id" es requerido.');
    }

    const rowsAffected = await commandService.deleteCommandById(id);

    if (rowsAffected > 0) {
      res.status(200).send(`Comando con ID ${id} eliminado correctamente.`);
    } else {
      res.status(404).send(`No se encontró ningún comando con el ID ${id}.`);
    }
  } catch (err) {
    console.error("Error al eliminar el comando", err);
    res.status(500).send("Error en el servidor");
  }
};
