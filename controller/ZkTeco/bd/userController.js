const userService = require('../../../services/userService');

// Controlador para manejar la creación de un usuario
exports.createUser = async (req, res) => {
    try {
        const userData = req.body;

        // Validación básica de los parámetros
        if (!userData.UserCode || !userData.Name || !userData.Card || !userData.Password || userData.IsActive === undefined || !userData.Role) {
            return res.status(400).json({ success: false, message: 'Faltan parámetros requeridos.' });
        }

        const result = await userService.createOrUpdateUser(userData);

        if (result.success) {            // Si un usuario fue creado o actualizado que lo envia a todos los equipos
            const cmd_create = `C:103:DATA UPDATE USERINFO PIN=${userData.UserCode}\tName=${userData.Name}\tPri=0\tPasswd=${userData.Password}\tCard=${userData.Card}\tGrp=1\tTZ=0000000100000000\tVerify=1\tViceCard=\tStartDatetime=0\tEndDatetime=0`;

            // Enviar comando de creación de usuario a todos los equipos registrados
            await commandService.broadCastCommand(cmd_create);

        }

        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Controlador para manejar la eliminación de un usuario por su código de usuario
exports.deleteUser = async (req, res) => {
    try {
        const { user_code: UserCode } = req.params;

        if (!UserCode) {
            return res.status(400).json({ success: false, message: 'Se requiere el código de usuario.' });
        }

        const result = await userService.deleteUser(UserCode);

        const cmd_create = `C:105:DATA DELETE USERINFO PIN=${UserCode}`;

        // Enviar comando de creación de usuario a todos los equipos registrados
        await commandService.broadCastCommand(cmd_create);

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};