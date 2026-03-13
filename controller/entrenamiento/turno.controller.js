/** 
 * RESTAURO turno.controller.js 
 */
const { request, response } = require("express");
const TurnoGimnasio = require("../../models/TurnoGimnasio");

const getTurnos = async (req = request, res = response) => {
    try {
        const turnos = await TurnoGimnasio.findAll({
            where: { estado: true }
        });
        res.json({ ok: true, data: turnos });
    } catch (error) {
        console.error("GET turnos error:", error);
        res.status(500).json({ ok: false, msg: "Error al obtener turnos" });
    }
};

const createTurno = async (req = request, res = response) => {
    try {
        const { nombre, hora_inicio, hora_fin } = req.body;
        const nuevo = await TurnoGimnasio.create({
            nombre,
            hora_inicio,
            hora_fin,
            estado: true
        });
        res.status(201).json({ ok: true, data: nuevo });
    } catch (error) {
        console.error("CREATE turno error:", error);
        res.status(500).json({ ok: false, msg: "Error al crear turno" });
    }
};

const updateTurno = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const exis = await TurnoGimnasio.findByPk(id);
        if (!exis) return res.status(404).json({ ok: false, msg: "No encontrado" });
        await exis.update(body);
        res.json({ ok: true, data: exis });
    } catch (error) {
        console.error("UPDATE turno error:", error);
        res.status(500).json({ ok: false, msg: "Error al actualizar turno" });
    }
};

module.exports = {
    getTurnos,
    createTurno,
    updateTurno
};
