// routes/bd/transactionRoutes.js
const express = require("express");
const router = express.Router();
const transactionController = require("../../../controller/ZkTeco/bd/transactionController");

// Ruta para insertar una transacción en dbo.zk_Transactions
router.post("/bd/transaction", transactionController.insertTransaction);

module.exports = router;
