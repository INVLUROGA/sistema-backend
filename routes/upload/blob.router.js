const { Router } = require("express");
const multer = require("multer");
const {
  uploadBlob,
  getImagesxUID,
  getUploadOnexUidLocation,
  postUploadsImgs,
  viewFile,
} = require("../../controller/upload/blob.controller");
const router = Router();
/*
/api/aporte
*/
const upload = multer();

router.post("/create/:uid_location", upload.single("file"), uploadBlob);
router.get("/view/:fileName", viewFile);
router.post("/create/uploads", postUploadsImgs);

router.get("/upload/gets-upload/:uidLocation", getImagesxUID);
router.get("/upload/get-upload/:uidLocation", getUploadOnexUidLocation);
module.exports = router;
