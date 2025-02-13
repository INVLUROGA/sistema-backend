const { Router } = require("express");
const multer = require("multer");
const {
  uploadBlob,
  getImagesxUID,
  getUploadOnexUidLocation,
} = require("../../controller/upload/blob.controller");
const router = Router();
/*
/api/aporte
*/
const upload = multer();

router.post("/create/:uid_location", upload.single("file"), uploadBlob);

router.get("/upload/gets-upload/:uidLocation", getImagesxUID);
router.get("/upload/get-upload/:uidLocation", getUploadOnexUidLocation);
module.exports = router;
