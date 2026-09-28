// routes/bd/deviceRoutes.js
const express = require("express");
const router = express.Router();
const deviceController = require("../../../controller/ZkTeco/bd/deviceController");

// Ruta para insertar una transacción en dbo.zk_Devices
router.post("/bd/device", deviceController.insertDevice);

// Estado online/offline de los dispositivos (panel de administración)
router.get("/bd/device/estado", deviceController.estadoDispositivos);

module.exports = router;
