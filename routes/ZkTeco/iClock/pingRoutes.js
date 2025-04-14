const express = require('express');
const router = express.Router();
const pingController = require('../../../controller/ZkTeco/iclock/pingController');

// Rutas relacionadas con /iclock/ping
router.get('/iclock/ping', pingController.fxget);

module.exports = router;