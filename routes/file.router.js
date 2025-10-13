const { Router } = require("express");
const {
  postFiles,
  deleteFilexID,
  obtenerFilesxUIDFILE,
  postFileInterno,
} = require("../controller/Files.controller");

const router = Router();
/**
 * [API Documentation]
 * /api/fils
 */

router.post("/post-file/:uid_file", postFiles);

router.put("/delete-file/:id_file", deleteFilexID);
router.get("/get-files/:uid_Location", obtenerFilesxUIDFILE);

router.post('/interno/:id_empresa', postFileInterno)

module.exports = router;
