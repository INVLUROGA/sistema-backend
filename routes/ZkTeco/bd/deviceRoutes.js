// routes/bd/deviceRoutes.js
const express = require("express");
const router = express.Router();
const deviceController = require("../../../controller/ZkTeco/bd/deviceController");

// Ruta para insertar una transacción en dbo.zk_Devices
router.post("/bd/device", deviceController.insertDevice);

module.exports = router;
