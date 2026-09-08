const { Router } = require("express");
const { check } = require("express-validator");
const {
  actualizarChecklistItem,
} = require("../controller/checklistItem.controller");
const { validarCampos } = require("../middlewares/validarCampos");
const { OPCIONES_CHECKLIST_ITEM } = require("../models/Checklist");

const router = Router();
/*
/api/checklist-item
*/

router.put(
  "/id/:id",
  [
    check("id", "EL ID DEBE SER NUMERICO").isInt(),
    check("opciones", "LAS OPCIONES DEBEN SER UN ARREGLO").isArray(),
    check(
      "opciones.*",
      `CADA OPCION DEBE SER UNA DE: ${OPCIONES_CHECKLIST_ITEM.join(", ")}`,
    ).isIn(OPCIONES_CHECKLIST_ITEM),
    check("revisado", "EL CAMPO REVISADO DEBE SER BOOLEANO").isBoolean(),
    validarCampos,
  ],
  actualizarChecklistItem,
);

module.exports = router;
