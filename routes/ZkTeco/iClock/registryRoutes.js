const express = require('express');
const router = express.Router();
const registryController = require('../../../controller/ZkTeco/iclock/registryController');

// Rutas relacionadas con /iclock/registry
router.get('/iclock/registry', registryController.fxget);
router.post('/iclock/registry', registryController.fxpost);

// Configuración para equipos de control de acceso (PUSH acc)
router.post('/iclock/push', registryController.fxpush);

module.exports = router;