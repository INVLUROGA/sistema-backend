const { Router } = require("express");
const {
  listClientesMF,
  getClienteMF,
  createClienteMF,
  updateClienteMF,
  deleteClienteMF,
} = require("../controller/cliente_mf.controller.js");

const router = Router();


router.get("/", listClientesMF);

router.get("/:id", getClienteMF);

router.post("/", createClienteMF);

router.put("/:id", updateClienteMF);

router.put("/delete/:id", deleteClienteMF);

module.exports = router;
