const { Router } = require("express");
const { validarJWT } = require("../middlewares/validarJWT");
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
  getPuedeEditarProspectoLead,
  deleteProspectoLead,
  postTareaProspectoLead,
  getTareasProspectoLead,
  getMembresiasClienteLead,
  getComentariosClienteLead,
  getClientesSinProspecto,
  getTareasReporte,
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
router.get("/lead/clientes-sin-prospecto", getClientesSinProspecto);
router.get("/lead/id/:id", getProspectoLeadPorID);
router.put("/lead/id/:id", validarJWT, putProspectoLead);
router.get("/lead/puede-editar/:id", validarJWT, getPuedeEditarProspectoLead);
router.put("/lead/delete/id/:id", deleteProspectoLead);

router.post("/lead/tarea", postTareaProspectoLead);
router.get("/lead/tareas/reporte", getTareasReporte);
router.get("/lead/tarea/:id_prospecto", getTareasProspectoLead);
router.get("/lead/cliente/:id_cli/membresias", getMembresiasClienteLead);
router.get("/lead/cliente/:id_cli/comentarios", getComentariosClienteLead);

module.exports = router;
