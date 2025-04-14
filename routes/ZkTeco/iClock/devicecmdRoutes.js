const express = require('express');
const router = express.Router();
const devicecmdController = require('../../../controller/ZkTeco/iclock/devicecmdController');

// Rutas relacionadas con /iclock/devicecmd
router.post('/iclock/devicecmd', devicecmdController.fxpost);

module.exports = router;