const { Router } = require("express");
const {
  postProspecto,
  getProspectos,
  getProspectoPorID,
  putProspecto,
  deleteProspecto,
} = require("../controller/prospecto.controller");
const {
  postProspectoLead,
  getProspectosLead,
  getProspectoLeadPorID,
  putProspectoLead,
  deleteProspectoLead,
} = require("../controller/prospecto_Lead.controller");
const router = Router();
/*
/api/prospecto
*/

router.post("/post-prospecto", postProspecto);
router.get("/get-prospectos", getProspectos);
router.get("/get-prospecto/:id", getProspectoPorID);
router.put("/put-prospecto/:id", putProspecto);
router.put("/put-prospecto/:id", deleteProspecto);

router.post("/lead/", postProspectoLead);
router.get("/lead/", getProspectosLead);
router.get("/lead/id/:id", getProspectoLeadPorID);
router.put("/lead/id/:id", putProspectoLead);
router.put("/lead/delete/id/:id", deleteProspectoLead);

module.exports = router;
