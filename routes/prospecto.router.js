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

router.post("/lead/post-prospecto-lead", postProspectoLead);
router.get("/lead/get-prospecto-lead", getProspectosLead);
router.get("/lead/get-prospecto-lead/:id", getProspectoLeadPorID);
router.put("/lead/put-prospecto-lead/:id", putProspectoLead);
router.put("/lead/delete-prospecto-lead/:id", deleteProspectoLead);

module.exports = router;
