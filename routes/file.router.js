const { Router } = require("express");
const {
  postFiles,
  deleteFilexID,
  obtenerFilesxUIDFILE,
  postFileInterno,
  obtenerFileInternoxUidLocation,
} = require("../controller/Files.controller");

const router = Router();
/**
 * [API Documentation]
 * /api/fils
 */

router.post("/post-file/:uid_file", postFiles);

router.put("/delete-file/:id_file", deleteFilexID);
router.get("/get-files/:uid_Location", obtenerFilesxUIDFILE);

router.post(
  "/interno/:id_seccionVisible/:uid_location/:id_empresa",
  postFileInterno
);
router.get(
  "/interno/:uid_location/:id_seccionVisible",
  obtenerFileInternoxUidLocation
);
module.exports = router;
