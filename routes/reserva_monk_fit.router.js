const { Router } = require("express");
const {
  obtenerReservasMonkFit,
  listarEstadosCita,
  postReservaMonkFit,
  putReservaMonkFit,
  deleteReservaMonkFit,
  seedReservaMonkFit,
} = require("../controller/reserva_monk_fit.controller.js");

const router = Router();


router.get("/", obtenerReservasMonkFit);

router.get("/estados", listarEstadosCita);

router.post("/", postReservaMonkFit);

router.put("/:id", putReservaMonkFit);

router.put("/delete/:id", deleteReservaMonkFit);

router.post("/seed", seedReservaMonkFit);

module.exports = router;
