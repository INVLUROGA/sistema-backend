const { Router } = require("express");
const {
  postDieta,
  obtenerDietasxCliente,
  deleteDieta,
  postClinico,
  obtenerTODOHistorialClinicoxcliente,
} = require("../controller/dieta.controller");
const {
  obtenerHistorialNutricionalGeneral,
  obtenerHistorialNutricional,
  postHistorialNutricional,
  putHistorialNutricional,
  deleteHistorialNutricional,
} = require("../controller/historialNutricional.controller");
const router = Router();
/**
 * [API Documentation]
 * /api/dieta
 */

router.post("/post-dieta/:id_cli", postDieta);
router.get("/get-dietas/:id_cli", obtenerDietasxCliente);
router.put("/delete-dieta/:id", deleteDieta);

router.post("/post-clinico/:id_cli", postClinico);
router.get("/get-h-clinico/:id_cli", obtenerTODOHistorialClinicoxcliente)

// tb_historial_nutricional (medidas de composicion corporal por fecha)
router.get("/historial-nutricional", obtenerHistorialNutricionalGeneral);
router.get("/historial-nutricional/:id_cli", obtenerHistorialNutricional);
router.post("/historial-nutricional/:id_cli", postHistorialNutricional);
router.put("/historial-nutricional/:id", putHistorialNutricional);
router.delete("/historial-nutricional/:id", deleteHistorialNutricional);
module.exports = router;
