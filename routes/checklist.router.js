const { Router } = require("express");
const { check } = require("express-validator");
const {
  crearChecklist,
  obtenerChecklistsPendientes,
  obtenerChecklistsHistorial,
  obtenerChecklistPorId,
  actualizarChecklist,
  completarChecklist,
  eliminarChecklist,
} = require("../controller/checklist.controller");
const { validarCampos } = require("../middlewares/validarCampos");

const router = Router();
/*
/api/checklist
*/

const validarCabeceraChecklist = [
  check("titulo", "EL TITULO DEL CHECKLIST ES OBLIGATORIO").not().isEmpty(),
  check(
    "fecha_checklist",
    "LA FECHA DEL CHECKLIST ES OBLIGATORIA",
  ).not().isEmpty(),
  check("responsable", "EL RESPONSABLE ES OBLIGATORIO").not().isEmpty(),
  validarCampos,
];

router.post(
  "/:id_empresa",
  [
    check("id_empresa", "EL ID DE LA EMPRESA DEBE SER NUMERICO").isInt(),
    ...validarCabeceraChecklist,
  ],
  crearChecklist,
);

router.get(
  "/empresa/:id_empresa",
  [
    check("id_empresa", "EL ID DE LA EMPRESA DEBE SER NUMERICO").isInt(),
    validarCampos,
  ],
  obtenerChecklistsPendientes,
);

router.get(
  "/historial/:id_empresa",
  [
    check("id_empresa", "EL ID DE LA EMPRESA DEBE SER NUMERICO").isInt(),
    validarCampos,
  ],
  obtenerChecklistsHistorial,
);

router.get(
  "/id/:id",
  [check("id", "EL ID DEBE SER NUMERICO").isInt(), validarCampos],
  obtenerChecklistPorId,
);

router.put(
  "/id/:id",
  [
    check("id", "EL ID DEBE SER NUMERICO").isInt(),
    ...validarCabeceraChecklist,
  ],
  actualizarChecklist,
);

router.put(
  "/completar/id/:id",
  [check("id", "EL ID DEBE SER NUMERICO").isInt(), validarCampos],
  completarChecklist,
);

router.put(
  "/delete/id/:id",
  [check("id", "EL ID DEBE SER NUMERICO").isInt(), validarCampos],
  eliminarChecklist,
);

module.exports = router;
