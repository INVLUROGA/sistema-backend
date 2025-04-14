const express = require('express');
const router = express.Router();
const cdataController = require('../../../controller/ZkTeco/iclock/cdataController');

// Rutas relacionadas con /iclock/cdata
router.get('/iclock/cdata', cdataController.fxget);
router.post('/iclock/cdata', cdataController.fxpost);

module.exports = router;