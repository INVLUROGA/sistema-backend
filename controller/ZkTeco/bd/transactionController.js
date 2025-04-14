// controllers/bd/transactionController.js
const transactionService = require("../../../services/transactionService");

exports.insertTransaction = async (req, res) => {
  console.log("-POST BD INSERT TRANSACTION-");

  try {
    // Extraer los datos del cuerpo de la solicitud POST
    const { user_code, punch_time } = req.body;

    // Verificar que se hayan enviado los parámetros necesarios
    if (!user_code || !punch_time) {
      return res.status(400).send("Faltan parámetros requeridos.");
    }

    // Llamar a la función del servicio para insertar la transacción
    await transactionService.insertTransaction(user_code, punch_time);

    // Respuesta exitosa
    res
      .status(200)
      .send(
        "Transacción insertada correctamente en la tabla dbo.zk_Transactions"
      );
  } catch (err) {
    console.error("Error al insertar la transacción en la base de datos", err);
    res.status(500).send("Error en el servidor");
  }
};
