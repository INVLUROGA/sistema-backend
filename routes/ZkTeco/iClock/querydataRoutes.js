const express = require('express');
const router = express.Router();
const querydataController = require('../../../controller/ZkTeco/iclock/querydataController');

// Rutas relacionadas con /iclock/querydata (equipos de control de acceso)
router.post('/iclock/querydata', querydataController.fxpost);

module.exports = router;
