const { Router } = require("express");
const { postLead, getLeads } = require("../controller/lead.controller.js");
const { mailNutricion } = require("../middlewares/mails.js");
// const {
//   verifyWhatsAppNumber,
//   WspCitasServicio,
// } = require("../middlewares/WspMessageStore.js");
const router = Router();
/*
/api/lead
*/
router.get("/:id_empresa", getLeads);
router.post("/:id_empresa", postLead);
// router.put("/put-cita/:id", putCita);
// router.put("/delete-cita/:id", deleteCita);

// router.get("/get-citas", getCitas);
module.exports = router;
