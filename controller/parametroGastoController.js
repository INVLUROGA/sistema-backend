const { request, response } = require("express");
const { ParametroGastos } = require("../models/GastosFyV");


const getParametroGasto = async (req = request, res = response) => {
    const { id } = req.params;
    try {
        const paramGasto = await ParametroGastos.findOne({
            where: { id },
            attributes: ["grupo", "id_tipoGasto"],
        });
        res.status(200).json({
            msg: "ok",
            paramGasto,
        });
    } catch (error) {
        res.status(404).json(error);
    }
};
const postActualizarParametroGasto = async (req = request, res = response) => {

    try {
        const { id } = req.body;
        const gasto = await ParametroGastos.findOne({
            where: { id: id },
        });
        await gasto.update(req.body);

        res.status(200).json({
            msg: "ok",
            parametro: gasto,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            msg: "Error",
            response: error.message,
        });
    };

};

const postRegistrarParametroGasto = async (req = request, res = response) => {
    try {
        const ParametroGasto = new ParametroGastos(req.body);

        await ParametroGasto.save();
        res.status(200).json({
            msg: "ok",
            parametro: ParametroGasto,
        });
    } catch (error) {
        res.status(500).json({
            msg: "Error",
            response: error.message,
        });
    };
};

const postEliminarParametroGasto = async (req = request, res = response) => {
    try {

        const { id } = req.body;
        const ParametroGasto = await ParametroGastos.findOne({
            where: { id: id },
        });

        ParametroGasto.flag = false;
        await ParametroGasto.save();

        res.status(200).json({
            msg: "ok",
            parametro: ParametroGasto,
        });
    } catch (error) {
        res.status(500).json({
            msg: "Error",
            response: error.message,
        });
    };
};

module.exports = {
    getParametroGasto,
    postActualizarParametroGasto,
    postRegistrarParametroGasto,
    postEliminarParametroGasto
};