const { Router } = require("express");
const {
  postCita,
  getCitasxServ,
  getCitaporID,
  deleteCita,
  putCita,
  getCitasxServicios,
  getCitasxServiciosFilter,
  postServiciosCita,
  getServiciosCita,
  putServiciosCita,
  obtenerServiciosxCliente,
  postReservasMFit,
} = require("../controller/cita.controller.js");
const { mailNutricion } = require("../middlewares/mails.js");
// const {
//   verifyWhatsAppNumber,
//   WspCitasServicio,
// } = require("../middlewares/WspMessageStore.js");
const router = Router();
/*
/api/cita
*/
router.get("/servicio-cita-id-cli/:id_cli", obtenerServiciosxCliente);
router.post("/servicio-cita/:id_empresa", postServiciosCita);
router.put("/servicio-cita/:id_cita", putServiciosCita);
router.get("/servicio-cita/:id_empresa", getServiciosCita);
router.get("/get-citas-empresa/:id_empresa", getCitasxServ);
router.get("/get-citas/:tipo_serv", getCitasxServicios);
router.post("/get-citas-filter/:tipo_serv", getCitasxServiciosFilter);
router.post(
  "/post-cita",
  // verifyWhatsAppNumber,
  // WspCitasServicio
  // mailNutricion,
  postCita
);
router.get("/get-cita/:id", getCitaporID);
router.put("/put-cita/:id", putCita);
router.put("/delete-cita/:id", deleteCita);

// router.post("/reservas-monkey-fit", postReservasMFit);
// router.get("/get-citas", getCitas);
module.exports = router;
