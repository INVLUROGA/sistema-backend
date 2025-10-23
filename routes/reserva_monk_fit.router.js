const { Router } = require("express");
const {
  obtenerReservasMonkFit,
  postReservaMonkFit,
  putReservaMonkFit,
  deleteReservaMonkFit,
  seedReservaMonkFit,
} = require("../controller/reserva_monk_fit.controller.js");

const router = Router();

// /api/reserva_monk_fit
router.get("/", obtenerReservasMonkFit);
router.post("/", postReservaMonkFit);
router.put("/:id", putReservaMonkFit);
router.put("/delete/:id", deleteReservaMonkFit);



module.exports = router;
