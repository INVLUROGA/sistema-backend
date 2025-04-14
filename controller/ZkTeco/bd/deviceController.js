// controllers/bd/deviceController.js
const deviceService = require("../../../services/deviceService");

exports.insertDevice = async (req, res) => {
  console.log("-POST BD INSERT DEVICE-");

  try {
    // Extraer los datos del cuerpo de la solicitud POST
    const { DeviceSN, IsActive } = req.body;

    // Verificar que se hayan enviado los parámetros requeridos
    if (!DeviceSN || typeof IsActive !== "boolean") {
      return res
        .status(400)
        .send("Faltan parámetros requeridos o formato incorrecto.");
    }

    // Llamar al servicio para insertar el dispositivo en la base de datos
    await deviceService.insertDevice(DeviceSN, IsActive);

    // Responder con el mensaje de éxito
    res
      .status(200)
      .send("Transacción insertada correctamente en la tabla dbo.zk_Devices");
  } catch (err) {
    console.error(
      "Error en el controlador al insertar en la base de datos",
      err
    );
    res.status(500).send("Error en el servidor");
  }
};
