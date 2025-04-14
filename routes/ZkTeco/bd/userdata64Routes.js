const express = require('express');
const router = express.Router();
const userdata64Controller = require('../../../controller/ZkTeco/bd/userdata64Controller');

// Ruta para crear un nuevo usuario
router.post('/bd/userdata64', userdata64Controller.updateFP);

module.exports = router;