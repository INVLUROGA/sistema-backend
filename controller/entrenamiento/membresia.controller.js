const { request, response } = require("express");
const { Op } = require("sequelize");
const { db } = require("../../database/sequelizeConnection");
const { Cliente } = require("../../models/Usuarios");
const { Venta, detalleVenta_membresias } = require("../../models/Venta");
const { ProgramaTraining, SemanasTraining } = require("../../models/ProgramaTraining");
const Asistencia = require("../../models/Asistencia");

// =============================================
// MEMBRESÍAS, VENTAS Y CLIENTES FS45
// =============================================

/**
 * Obtiene clientes con plan FS45 (id_pgm=4) activo.
 * NOTA: Usa SQL crudo por complejidad de JOINs con TRY_CONVERT y DATEADD (SQL Server).
 */
const getClientesFs45 = async (req = request, res = response) => {
    try {
        const { search } = req.query;

        let sql = `
            SELECT 
                c.id_cli, 
                c.nombre_cli, 
                c.apPaterno_cli, 
                c.apMaterno_cli, 
                c.numDoc_cli, 
                c.uid_avatar, 
                c.email_cli,
                pgm.id_pgm,
                pgm.name_pgm,
                dvm.id_st as id_semana,
                dvm.fecha_inicio as fecha_inicio_plan,
                COALESCE(TRY_CONVERT(DATE, dvm.fec_fin_mem, 103), dvm.fec_fin_mem_oftime) as fecha_fin_plan
            FROM tb_clientes c
            INNER JOIN tb_venta v ON c.id_cli = v.id_cli
            INNER JOIN detalle_ventaMembresia dvm ON v.id = dvm.id_venta
            LEFT JOIN tb_semana_training st ON dvm.id_st = st.id_st
            INNER JOIN tb_ProgramaTraining pgm ON pgm.id_pgm = COALESCE(dvm.id_pgm, st.id_pgm)
            WHERE pgm.id_pgm = 4
            AND (
                dvm.fec_fin_mem_oftime >= CAST(GETDATE() AS DATE)
                OR TRY_CONVERT(DATE, dvm.fec_fin_mem, 103) >= CAST(GETDATE() AS DATE)
                OR TRY_CONVERT(DATE, dvm.fec_fin_mem, 120) >= CAST(GETDATE() AS DATE)
            )
        `;

        const replacements = {};

        if (search) {
            sql += ` AND (
                c.nombre_cli LIKE :search OR 
                c.apPaterno_cli LIKE :search OR 
                c.apMaterno_cli LIKE :search OR 
                c.numDoc_cli LIKE :search
            )`;
            replacements.search = `%${search}%`;
        }

        if (req.query.onlyWithHistory === 'true') {
            sql += ` AND EXISTS (
                SELECT 1 FROM tb_historial_entrenamientos he 
                WHERE he.id_cliente = c.id_cli AND he.flag = 1
            )`;
        }

        sql += ` ORDER BY c.nombre_cli ASC`;

        const results = await db.query(sql, {
            replacements,
            type: db.QueryTypes.SELECT
        });

        const rows = results.map(row => ({
            value: row.id_cli,
            label: `${row.nombre_cli} ${row.apPaterno_cli || ""} ${row.apMaterno_cli || ""}`.trim(),
            avatar: row.uid_avatar,
            email: row.email_cli,
            id_pgm: row.id_pgm,
            name_pgm: row.name_pgm || "FISIO MUSCLE",
            id_semana: row.id_semana,
            fecha_inicio_plan: row.fecha_inicio_plan,
            fecha_fin_plan: row.fecha_fin_plan,
            is_plan_expired: false
        }));

        res.json({ rows });

    } catch (error) {
        console.error("GET clientes-fs45 error:", error);
        res.status(500).json({ rows: [], msg: "Error al obtener clientes FS45" });
    }
};

/**
 * Obtiene membresías activas de un cliente.
 */
const getMembresiasActivas = async (req = request, res = response) => {
    try {
        const { id_cliente } = req.params;
        const { fecha } = req.query;
        const fechaFiltro = fecha ? new Date(fecha) : new Date();

        const membresias = await db.query(`
            SELECT 
                dvm.id,
                dvm.id_venta,
                dvm.id_st,
                dvm.fecha_inicio,
                DATEADD(week, st.semanas_st, dvm.fecha_inicio) as calculated_end_date,
                st.semanas_st,
                st.sesiones,
                pgm.id_pgm,
                pgm.name_pgm,
                (SELECT COUNT(DISTINCT fecha_ingreso) 
                 FROM tb_asistencia a 
                 WHERE a.id_detalle_membresia = dvm.id 
                 AND a.estado = 1
                ) as asistencias_realizadas
            FROM detalle_ventaMembresia dvm
            INNER JOIN tb_venta v ON dvm.id_venta = v.id
            LEFT JOIN tb_semana_training st ON dvm.id_st = st.id_st
            LEFT JOIN tb_ProgramaTraining pgm ON st.id_pgm = pgm.id_pgm
            WHERE v.id_cli = :id_cliente
            AND dvm.fecha_inicio <= :fecha
            AND DATEADD(week, COALESCE(st.semanas_st, 0), dvm.fecha_inicio) >= :fecha
            ORDER BY dvm.fecha_inicio DESC
        `, {
            replacements: { id_cliente, fecha: fechaFiltro },
            type: db.QueryTypes.SELECT
        });

        res.json({ ok: true, data: membresias });
    } catch (error) {
        console.error("GET membresias activas error:", error);
        res.status(500).json({ ok: false, msg: "Error al obtener membresías activas" });
    }
};

/**
 * Obtiene ventas con membresía de un cliente, incluyendo conteo de asistencias.
 */
const getVentasCliente = async (req = request, res = response) => {
    try {
        const { id_cliente } = req.params;

        const ventas = await Venta.findAll({
            where: { id_cli: id_cliente, flag: true },
            order: [['fecha_venta', 'DESC']],
            include: [{
                model: detalleVenta_membresias,
                required: true,
                include: [{
                    model: ProgramaTraining,
                    attributes: ['id_pgm', 'name_pgm']
                }, {
                    model: SemanasTraining,
                    attributes: ['id_st', 'semanas_st', 'sesiones', 'nutricion_st']
                }]
            }]
        });

        const ventasConAsistencia = await Promise.all(ventas.map(async (venta) => {
            const v = venta.toJSON();
            const det = v.detalle_ventaMembresia?.[0];

            if (det) {
                try {
                    const asistenciasCount = await Asistencia.count({
                        where: {
                            id_detalle_membresia: det.id,
                            estado: true
                        },
                        distinct: true,
                        col: 'fecha_ingreso'
                    });
                    v.asistencias_realizadas = asistenciasCount || 0;
                } catch (errCount) {
                    console.error('Error counting asistencia for venta:', v.id, errCount);
                    v.asistencias_realizadas = 0;
                }
                const st = det.SemanasTraining || det.tb_semana_training;
                v.sesiones_totales = st?.sesiones || (st?.semanas_st * 5) || 0;
            } else {
                v.asistencias_realizadas = 0;
                v.sesiones_totales = 0;
            }
            return v;
        }));

        res.json({ ok: true, data: ventasConAsistencia });
    } catch (error) {
        console.error("GET ventas cliente error:", error);
        res.status(500).json({ ok: false, msg: "Error al obtener ventas del cliente" });
    }
};

module.exports = {
    getClientesFs45,
    getMembresiasActivas,
    getVentasCliente,
};
