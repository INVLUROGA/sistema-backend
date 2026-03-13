const { request, response } = require("express");
const { Op } = require("sequelize");
const { db } = require("../../database/sequelizeConnection");
const Asistencia = require("../../models/Asistencia");
const { Cliente } = require("../../models/Usuarios");
const { detalleVenta_membresias } = require("../../models/Venta");
const { ProgramaTraining } = require("../../models/ProgramaTraining");
const { extractDateStr } = require("../../helpers/fechaHelper");

const getAsistenciaPorPlan = async (req = request, res = response) => {
    try {
        const { id_venta } = req.params;
        const asistencias = await Asistencia.findAll({
            where: { id_detalle_membresia: id_venta, estado: true },
            order: [['fecha_ingreso', 'DESC']]
        });
        res.json({ ok: true, data: asistencias });
    } catch (error) {
        console.error("GET asistencia-por-plan error:", error);
        res.status(500).json({ ok: false, msg: "Error al obtener asistencias" });
    }
};

const obtenerAsistenciasConPlan = async (req = request, res = response) => {
    try {
        const asistencias = await Asistencia.findAll({
            where: { estado: true },
            include: [
                { model: Cliente, attributes: ['nombre_cli', 'apPaterno_cli'] },
                {
                    model: detalleVenta_membresias,
                    include: [{ model: ProgramaTraining, attributes: ['name_pgm'] }]
                }
            ],
            limit: 100,
            order: [['fecha_ingreso', 'DESC']]
        });
        res.json({ ok: true, data: asistencias });
    } catch (error) {
        console.error("GET asistencias-con-plan error:", error);
        res.status(500).json({ ok: false, msg: "Error al obtener asistencias con plan" });
    }
};

const registrarAsistencia = async (req = request, res = response) => {
    try {
        const { id_cliente, id_detalle_membresia, fecha_ingreso, id_turno } = req.body;
        const nuevaAsistencia = await Asistencia.create({
            id_cliente,
            id_detalle_membresia: id_detalle_membresia || null,
            id_turno: id_turno || null,
            fecha_ingreso: fecha_ingreso || extractDateStr(new Date()),
            metodo_ingreso: 'MANUAL',
            estado: true
        });
        res.status(201).json({ ok: true, data: nuevaAsistencia });
    } catch (error) {
        console.error("REGISTER asistencia error:", error);
        res.status(500).json({ ok: false, msg: "Error al registrar asistencia" });
    }
};

const asignarPlan = async (req = request, res = response) => {
    try {
        const { id_asistencia, id_detalle_membresia } = req.body;
        const asist = await Asistencia.findByPk(id_asistencia);
        if (!asist) return res.status(404).json({ ok: false, msg: "No encontrada" });
        await asist.update({ id_detalle_membresia });
        res.json({ ok: true, data: asist });
    } catch (error) {
        console.error("ASSIGN plan error:", error);
        res.status(500).json({ ok: false, msg: "Error al asignar plan" });
    }
};

module.exports = {
    getAsistenciaPorPlan,
    obtenerAsistenciasConPlan,
    asignarPlan,
    registrarAsistencia
};
