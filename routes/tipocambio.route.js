const { Router } = require("express");
const {
  obtenerTipoCambioxFecha,
  obtenerTipoCambiosxFechas,
  buscar,
  eliminar,
  crear,
  actualizar,
  obtenerTipoCambio,
  obtenerMonedaOrigenYDestino,
  postMonedaOrigenYDestino,
  obtenerTCs,
  postTC,
  deleteTCxID,
  updateTCxID,
  obtenerTCxID,
} = require("../controller/tipoCanbio.controller");
const router = Router();
/*
    api/tipocambio
*/
router.get("/obtener-tipo-cambio", obtenerTipoCambioxFecha);
router.get("/obtener-rango-fechas", obtenerTipoCambiosxFechas);
router.get("/obtener-tipo-cambio-all", obtenerTipoCambio);
router.get("/buscar/:id", buscar);
router.post("/eliminar", eliminar);
router.post("/crear", crear);
router.post("/actualizar", actualizar);

router.get(
  "/obtener-tipo-cambio/:monedaOrigen/:monedaDestino",
  obtenerMonedaOrigenYDestino,
);

router.get("/", obtenerTCs);
router.get("/id/:id", obtenerTCxID);
router.post("/", postTC);
router.put("/delete/:id", deleteTCxID);
router.put("/id/:id", updateTCxID);
router.post("/:monedaOrigen/:monedaDestino", postMonedaOrigenYDestino);

module.exports = router;
