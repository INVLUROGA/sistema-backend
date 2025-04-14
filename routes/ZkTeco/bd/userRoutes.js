const express = require('express');
const router = express.Router();
const userController = require('../../../controller/ZkTeco/bd/userController');

// Ruta para crear un nuevo usuario
router.post('/bd/user', userController.createUser);

// Ruta para eliminar un usuario por su código
router.delete('/bd/user/:user_code', userController.deleteUser);

module.exports = router;