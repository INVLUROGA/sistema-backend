const { Router } = require("express");
const { obtenerRelojZk } = require("../controller/zkTeco.controller");
const router = Router();
// const edge = require("edge-js");
// const path = require("path");

// const myFunc = edge.func({
//   assemblyFile: path.join(
//     __dirname,
//     "../../helpers/versionect/zkfpWrapper.dll"
//   ),
//   typeName: "ZkfpWrapper",
//   methodName: "Init",
// });
router.get("/obtener-tipo-cambio", obtenerRelojZk);
module.exports = router;
