const { Router } = require("express");
const {
  obtenerReservasMonkFit,
  listarEstadosCita,
  postReservaMonkFit,
  putReservaMonkFit,
  deleteReservaMonkFit,
} = require("../controller/reserva_monk_fit.controller.js");

const router = Router();

// === Endpoints ===
router.get("/", obtenerReservasMonkFit);
router.get("/estados", listarEstadosCita);
router.post("/", postReservaMonkFit);
router.put("/:id", putReservaMonkFit);
router.put("/delete/:id", deleteReservaMonkFit);

module.exports = router;
