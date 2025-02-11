const { Router } = require("express");
const { obtenerRelojZk } = require("../../controller/ZkTeco/zkTeco.controller");
const router = Router();
// const edge = require('edge-js')


// const myFunc = edge.func(
//     {
//         assemblyFile:   path.join(__dirname, 'helpers/libzkfpcsharp.dll'),
//         typeName: 'libzkfpcsharp.zkfp',
//         methodName: 'Metodo'
//     }
// )
router.get("/obtener-tipo-cambio", obtenerRelojZk);
module.exports = router;
