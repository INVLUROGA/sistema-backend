const { Router } = require("express");
const {
  PostAlertaUsuario,
  GetAlertaUsuario,
  GetAlertaUsuarios,
  deleteAlertaUsuario,
  updateAlertaUsuario,
  updateMensaje,
} = require("../controller/alertaUsuario.controller");
const router = Router();
/*
/api/aporte
*/
//
router.get("/get-alerta-usuario/:id", GetAlertaUsuario);
router.post("/alerta-usuario", PostAlertaUsuario);
router.get("/get-alertas", GetAlertaUsuarios);
router.put("/put-alerta/:id", updateAlertaUsuario);
router.put("/delete-alerta/:id", deleteAlertaUsuario);
router.put("/edit-mensaje", updateMensaje);
module.exports = router;
