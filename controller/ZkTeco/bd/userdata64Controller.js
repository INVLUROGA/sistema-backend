const userdata64Service = require('../../../services/userdata64Service')
const commandService = require('../../../services/commandService');

// Controlador para agregar huella

exports.updateFP = async (req, res) => {
    try {
        const userData = req.body;
        // Validación básica de los parámetros
        if (!userData.UserCode || !userData.DataIndex || !userData.SizeData || !userData.BinaryData) {
            return res.status(400).json({ success: false, message: 'Faltan parámetros requeridos.' });
        }

        const result = await userdata64Service.checkOrInsertFPAPI(userData);

        if (result.success) {            // Si una huela fue agregada que lo envie a todos los equipos
            const cmd_create = `C:104:DATA UPDATE FINGERTMP PIN=${userData.UserCode}\tFID=${userData.DataIndex}\tSize=${userData.SizeData}\tValid=1\tTMP=${userData.BinaryData}`;

            // Enviar comando de creación de usuario a todos los equipos registrados
            await commandService.broadCastCommand(cmd_create);

        }

        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};