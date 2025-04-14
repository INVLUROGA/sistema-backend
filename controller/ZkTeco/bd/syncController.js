const syncService = require('../../../services/syncService');
const commandService = require('../../../services/commandService');

// Controlador para manejar la ruta de obtener información de usuario y datos asociados
exports.syncByUser = async (req, res) => {
    const UserCode = req.params.UserCode;
    try {
        const result = await syncService.getUserInfoAndData(UserCode);

        if (result.sucess === true) {
            const cmd_create = `C:103:DATA UPDATE USERINFO PIN=${result.user.UserCode}\tName=${result.user.Name}\tPri=0\tPasswd=${result.user.Password}\tCard=${result.user.Card}\tGrp=1\tTZ=0000000100000000\tVerify=1\tViceCard=\tStartDatetime=0\tEndDatetime=0`;

            // Enviar comando de creación de usuario a todos los equipos registrados
            await commandService.broadCastCommand(cmd_create);

            if (result.data && result.data.length > 0) {

                for (let i = 0; i < result.data.length; i++) {
                    const cmd_create = `C:104:DATA UPDATE FINGERTMP PIN=${result.user.UserCode}\tFID=${result.data[i].DataIndex}\tSize=${result.data[i].SizeData}\tValid=1\tTMP=${result.data[i].BinaryDataBase64}`;

                    // Enviar comando de creación de usuario a todos los equipos registrados
                    await commandService.broadCastCommand(cmd_create);
                }
            }
        }

        res.json(result); // Enviar la respuesta en formato JSON
    } catch (error) {
        res.status(500).json({ message: `Error al obtener la información del usuario ${result.user.UserCode}.`, error: error.message });
    }
};



