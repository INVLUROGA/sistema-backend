const express = require('express');
const router = express.Router();
const getrequestController = require('../../../controller/ZkTeco/iclock/getrequestController');

// Rutas relacionadas con /iclock/getrequest
router.get('/iclock/getrequest', getrequestController.fxget);

module.exports = router;