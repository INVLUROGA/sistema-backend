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
  getServiciosCita
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
router.post("/servicio-cita/:id_empresa", postServiciosCita);
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

// router.get("/get-citas", getCitas);
module.exports = router;
