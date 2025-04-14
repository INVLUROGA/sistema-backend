const express = require('express');
const router = express.Router();
const registryController = require('../../../controller/ZkTeco/iclock/registryController');

// Rutas relacionadas con /iclock/registry
router.get('/iclock/registry', registryController.fxget);

module.exports = router;