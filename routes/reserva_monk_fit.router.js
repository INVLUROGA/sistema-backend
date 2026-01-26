const { Router } = require("express");
const {
  obtenerReservasMonkFit,
  listarEstadosCita,
  postReservaMonkFit,
  putReservaMonkFit,
  deleteReservaMonkFit,
  obtenerReservasMonkeyFit,
} = require("../controller/reserva_monk_fit.controller.js");

const router = Router();
// /reserva_monk_fit
// === Endpoints ===
router.get("/", obtenerReservasMonkFit);
router.get("/estados", listarEstadosCita);
router.post("/", postReservaMonkFit);
router.put("/:id", putReservaMonkFit);
router.put("/delete/:id", deleteReservaMonkFit);
router.get("/g", obtenerReservasMonkeyFit);
module.exports = router;
