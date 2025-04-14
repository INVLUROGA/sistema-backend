const express = require('express');
const router = express.Router();
const syncController = require('../../../controller/ZkTeco/bd/syncController');

// Ruta para sincronizar un usuario por su código
router.get('/bd/sync/:UserCode', syncController.syncByUser);

module.exports = router;