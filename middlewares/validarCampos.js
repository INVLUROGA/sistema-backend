const { response } = require("express");
const { validationResult } = require("express-validator");

const validarCampos = (req, res=response, next)=>{

    const errors= validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({
            ok: false, 
            Componenterrors: errors.mapped()
        })
    }

    next()


}

module.exports ={
    validarCampos
}
