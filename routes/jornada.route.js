const { Router } = require("express");

const {
  postJornada,
  obtenerJornadas,
  obtenerJornadaxEmpl
} = require("../controller/jornada.controller");
const router = Router();
/**
 * [API Documentation]
 * /api/jornada
 */

router.post("/post-jornada/:id_enterprice", postJornada);
router.get("/obtener-jornadas/:id_enterprice", obtenerJornadas);

router.get("/obtener-jornada-x-empl/:uid_empl", obtenerJornadaxEmpl)

// router.post()

//RUTAS - GASTO FIJO
// router.get("/get_gfs", obtenerTB_GF);
// router.get("/get_gf/:id", obtener_GFxID);
// router.post("/post_gf", post_GF);
// router.put("/delete_gf/:id", eliminar_GF);
// router.put("/put_gf/:id", put_GF);

//RUTAS - GASTO VARIABLES
// router.get("/get_gvs", obtenerTB_GV);
// router.get("/get_gv/:id", obtener_GVxID);
// router.post("/post_gv", post_GV);
// router.put("/delete_gv/:id", eliminar_GV);
// router.put("/put_gv/:id", put_GV);

module.exports = router;
