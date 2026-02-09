const { Router } = require("express");
const { getBlacklistHandler, addBlacklistHandler, removeBlacklistHandler } = require("../controller/blacklist.controller");

const router = Router();

router.get("/", getBlacklistHandler);
router.post("/add", addBlacklistHandler);
router.post("/remove", removeBlacklistHandler);

module.exports = router;
