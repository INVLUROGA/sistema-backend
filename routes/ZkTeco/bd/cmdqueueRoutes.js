const express = require('express');
const router = express.Router();
const cmdqueueController = require('../../../controller/ZkTeco/bd/cmdqueueController');

// Rutas relacionadas con /bd/cmdqueue
router.post('/bd/cmdqueue', cmdqueueController.insertCMD);
router.get('/bd/cmdqueue', cmdqueueController.getRecentCMD);
router.delete('/bd/cmdqueue/:id', cmdqueueController.deleteCommandById);


module.exports = router;