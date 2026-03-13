const { request, response } = require("express");
const CatalogoEntrenamiento = require("../../models/CatalogoEntrenamientos");
const TipoEjercicio = require("../../models/TipoEjercicio");

const getEntrenamientos = async (req = request, res = response) => {
    try {
        const entrenamientos = await CatalogoEntrenamiento.findAll({
            include: [{ model: TipoEjercicio }]
        });
        res.json({ ok: true, data: entrenamientos });
    } catch (error) {
        console.error("GET entrenamientos error:", error);
        res.status(500).json({ ok: false, msg: "Error al obtener catálogo" });
    }
};

const createEntrenamiento = async (req = request, res = response) => {
    try {
        const { nombre, descripcion, id_tipo, es_maquina } = req.body;
        const nuevo = await CatalogoEntrenamiento.create({
            nombre,
            descripcion,
            id_tipo,
            es_maquina
        });
        res.status(201).json({ ok: true, data: nuevo });
    } catch (error) {
        console.error("CREATE entrenamiento error:", error);
        res.status(500).json({ ok: false, msg: "Error al crear ejercicio" });
    }
};

const updateEntrenamiento = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const exis = await CatalogoEntrenamiento.findByPk(id);
        if (!exis) return res.status(404).json({ ok: false, msg: "No encontrado" });
        await exis.update(body);
        res.json({ ok: true, data: exis });
    } catch (error) {
        console.error("UPDATE entrenamiento error:", error);
        res.status(500).json({ ok: false, msg: "Error al actualizar ejercicio" });
    }
};

const getTiposEjercicio = async (req = request, res = response) => {
    try {
        const tipos = await TipoEjercicio.findAll();
        res.json({ ok: true, data: tipos });
    } catch (error) {
        res.status(500).json({ ok: false, msg: "Error al obtener tipos" });
    }
};

const createTipoEjercicio = async (req = request, res = response) => {
    try {
        const { nombre } = req.body;
        const nuevo = await TipoEjercicio.create({ nombre });
        res.status(201).json({ ok: true, data: nuevo });
    } catch (error) {
        res.status(500).json({ ok: false, msg: "Error al crear tipo" });
    }
};

module.exports = {
    getEntrenamientos,
    createEntrenamiento,
    updateEntrenamiento,
    getTiposEjercicio,
    createTipoEjercicio
};
