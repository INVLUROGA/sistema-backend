const { Router } = require("express");
const {
  obtenerServiciosActivos,
  obtenerVentasTemporales,
} = require("../../controller/controllersCircus/servicios.controller.js");
const router = Router();
/**
 * /api/serviciospt
 */
// router.post("/servFitology/post", postFitology);
// router.get("servFitology/getTB", getTBFitology);

// router.post("/servNutricion/post", postNutricion);
// router.get("/servNutricion/getTB", getTBNutricion);

// router.get("/servicios/getOne/:id", getOneServicio);
// router.put("/servicios/delete/:id", deleteOneServicio);
// router.put("/servicios/update/:id", updateOneServicio);

// router.post("/serviciocita/post/:tipo_serv", postServicioCita);
router.get("/obtener-servicios", obtenerServiciosActivos);
router.get("/obtener-ventas-temp", obtenerVentasTemporales);
// router.get("/serviciocita/get/:id", getServicioCitaxID);
// router.put("/serviciocita/put/:id", putServicioCitaxID);
// router.delete("/serviciocita/delete/:id", deleteServicioCitaxID);

module.exports = router;
