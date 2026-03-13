const { request, response } = require("express");
const { Op } = require("sequelize");
const { db } = require("../../database/sequelizeConnection");
const CatalogoEntrenamiento = require("../../models/CatalogoEntrenamientos");
const HistorialEntrenamiento = require("../../models/HistorialEntrenamientos");
const { Cliente } = require("../../models/Usuarios");
const TipoEjercicio = require("../../models/TipoEjercicio");
const { Venta, detalleVenta_membresias } = require("../../models/Venta");
const { ProgramaTraining, SemanasTraining } = require("../../models/ProgramaTraining");
const TurnoGimnasio = require("../../models/TurnoGimnasio");
const Asistencia = require("../../models/Asistencia");
const { parseFecha, formatDateEs, formatDateEsShort, extractDateStr, calcularSemana } = require("../../helpers/fechaHelper");

// =============================================
// HISTORIAL DE ENTRENAMIENTOS
// =============================================

/**
 * Busca la membresía activa para un cliente en una fecha dada.
 * Usa SQL crudo por DATEADD (SQL Server).
 */
const findActiveMembership = async (id_cliente, fecha) => {
    try {
        const membresiasRaw = await db.query(`
            SELECT 
                dvm.id,
                dvm.fecha_inicio,
                DATEADD(week, st.semanas_st, dvm.fecha_inicio) as calculated_fin
            FROM detalle_ventaMembresia dvm
            INNER JOIN tb_venta v ON dvm.id_venta = v.id
            LEFT JOIN tb_semana_training st ON dvm.id_st = st.id_st
            WHERE v.id_cli = :id_cliente
            AND dvm.fecha_inicio <= :fecha
            AND DATEADD(week, COALESCE(st.semanas_st, 0), dvm.fecha_inicio) >= :fecha
            ORDER BY dvm.fecha_inicio DESC
        `, {
            replacements: {
                id_cliente,
                fecha: fecha instanceof Date ? fecha : new Date(fecha)
            },
            type: db.QueryTypes.SELECT
        });

        return membresiasRaw.length > 0 ? membresiasRaw[0].id : null;
    } catch (error) {
        console.error("Error finding active membership:", error);
        return null;
    }
};

/**
 * Obtiene datos de una membresía por ID.
 * Convertido de SQL crudo a Sequelize ORM.
 */
const getMembershipData = async (id) => {
    const mem = await detalleVenta_membresias.findByPk(id, {
        attributes: ['id', 'fecha_inicio', 'fec_fin_mem', 'fec_fin_mem_oftime']
    });
    if (!mem) return null;

    const data = mem.toJSON();
    return {
        id: data.id,
        fecha_inicio: data.fecha_inicio,
        fec_fin: data.fec_fin_mem || data.fec_fin_mem_oftime
    };
};

const getHistorialByCliente = async (req = request, res = response) => {
    try {
        const { id_cliente } = req.params;

        const historial = await HistorialEntrenamiento.findAll({
            where: { id_cliente, flag: true },
            attributes: {
                include: [
                    [db.literal("CONVERT(VARCHAR(10), fecha, 23)"), "fechaTexto"]
                ]
            },
            include: [
                {
                    model: CatalogoEntrenamiento,
                    attributes: ["nombre", "descripcion", "es_maquina"],
                    include: [{ model: TipoEjercicio }]
                },
                {
                    model: ProgramaTraining,
                    attributes: ["id_pgm", "name_pgm"],
                    include: [{
                        model: SemanasTraining,
                        attributes: ["id_st", "semanas_st", "sesiones", "nutricion_st", "congelamiento_st"]
                    }]
                },
                {
                    model: detalleVenta_membresias,
                    attributes: ["id", "fec_fin_mem", "fec_fin_mem_oftime"],
                    include: [{
                        model: SemanasTraining,
                        attributes: ["id_st", "semanas_st", "sesiones", "nutricion_st", "congelamiento_st"]
                    }]
                },
                {
                    model: TurnoGimnasio,
                    attributes: ["id", "nombre", "hora_inicio", "hora_fin"]
                }
            ],
            order: [["fecha", "DESC"]],
        });

        const historialConPlan = historial.map(h => {
            const hData = h.toJSON();
            if (hData.fechaTexto) {
                hData.fecha = hData.fechaTexto;
            }
            return hData;
        });

        res.json({
            ok: true,
            data: historialConPlan
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: "Error al obtener historial"
        });
    }
};

const saveHistorial = async (req = request, res = response) => {
    try {
        const { id_cliente, id_entrenamiento, fecha, series, repeticiones, peso, tiempo, id_pgm, id_turno, id_detalle_membresia, comentario } = req.body;

        if (!id_cliente || !id_entrenamiento) {
            return res.status(400).json({ ok: false, msg: "Faltan datos (cliente o entrenamiento)" });
        }

        // 1. Procesar la fecha base (YYYY-MM-DD)
        const { fechaStr: fechaBase, fechaDate } = parseFecha(fecha);

        // 2. Verificar si YA existe asistencia HOY - DB es tipo 'date'
        const existingDay = await Asistencia.findAll({
            where: {
                id_cliente,
                fecha_ingreso: fechaBase
            },
            attributes: ['id'],
            limit: 1
        });

        // 3. Detectar y validar membresía (ESTRICTO)
        let finalIdDetalleMembresia = id_detalle_membresia;
        let membershipData = null;

        if (finalIdDetalleMembresia) {
            membershipData = await getMembershipData(finalIdDetalleMembresia);
        } else {
            finalIdDetalleMembresia = await findActiveMembership(id_cliente, fechaDate);
            if (finalIdDetalleMembresia) {
                membershipData = await getMembershipData(finalIdDetalleMembresia);
            }
        }

        if (!membershipData) {
            return res.status(400).json({
                ok: false,
                msg: `No existe membresía válida para la fecha ${formatDateEs(fechaDate)}. Verifica el rango.`
            });
        }

        const mStart = new Date(membershipData.fecha_inicio);
        const mEnd = new Date(membershipData.fec_fin);
        mStart.setHours(0, 0, 0, 0);
        mEnd.setHours(23, 59, 59, 999);
        const wDate = new Date(fechaDate);
        wDate.setHours(12, 0, 0, 0);

        if (wDate < mStart || wDate > mEnd) {
            const realMembershipId = await findActiveMembership(id_cliente, fechaDate);
            let foundAlternative = false;
            if (realMembershipId) {
                const altData = await getMembershipData(realMembershipId);
                if (altData) {
                    const aStart = new Date(altData.fecha_inicio);
                    const aEnd = new Date(altData.fec_fin);
                    aStart.setHours(0, 0, 0, 0);
                    aEnd.setHours(23, 59, 59, 999);
                    if (wDate >= aStart && wDate <= aEnd) {
                        finalIdDetalleMembresia = altData.id;
                        membershipData = altData;
                        foundAlternative = true;
                    }
                }
            }
            if (!foundAlternative) {
                return res.status(400).json({
                    ok: false,
                    msg: `La fecha ${formatDateEs(wDate)} está fuera del plan seleccionado (${formatDateEs(mStart)} - ${formatDateEs(mEnd)}) y no se encontró otra membresía activa.`
                });
            }
        }

        // VALIDACIÓN DE LÍMITE DE SESIONES DEL PLAN
        if (existingDay.length === 0 && finalIdDetalleMembresia) {
            const memDetail = await detalleVenta_membresias.findByPk(finalIdDetalleMembresia, {
                include: [{
                    model: SemanasTraining,
                    attributes: ['semanas_st']
                }],
                attributes: ['id', 'fecha_inicio']
            });

            if (memDetail) {
                const fecha_inicio = memDetail.fecha_inicio;
                const semanas = memDetail.tb_semana_training?.semanas_st || 0;

                const totalUsadas = await Asistencia.count({
                    where: { id_detalle_membresia: finalIdDetalleMembresia },
                    distinct: true,
                    col: 'fecha_ingreso'
                });

                const maxGlobal = semanas * 5;
                if (totalUsadas >= maxGlobal && maxGlobal > 0) {
                    return res.status(400).json({
                        ok: false,
                        msg: `Has alcanzado el límite total del plan: ${totalUsadas}/${maxGlobal}.`
                    });
                }

                if (fecha_inicio) {
                    const semanaInfo = calcularSemana(fecha_inicio, fechaDate);
                    if (semanaInfo) {
                        const { weekIndex, weekStart, weekEnd } = semanaInfo;
                        const asistenciasSemana = await Asistencia.count({
                            where: {
                                id_detalle_membresia: finalIdDetalleMembresia,
                                fecha_ingreso: {
                                    [Op.between]: [extractDateStr(weekStart), extractDateStr(weekEnd)]
                                }
                            },
                            distinct: true,
                            col: 'fecha_ingreso'
                        });

                        if (asistenciasSemana >= 5) {
                            return res.status(400).json({
                                ok: false,
                                msg: `Límite semanal alcanzado (Semana ${weekIndex + 1}: ${formatDateEsShort(weekStart)} - ${formatDateEsShort(weekEnd)}). Ya tienes ${asistenciasSemana}/5 asistencias.`
                            });
                        }
                    }
                }
            }
        }

        // 4. Crear el Historial
        const nuevo = await HistorialEntrenamiento.create({
            id_cliente,
            id_entrenamiento,
            fecha: fechaBase,
            series: series || 0,
            repeticiones: repeticiones || 0,
            peso: peso || 0,
            ...(tiempo !== undefined && { tiempo }),
            ...(id_pgm !== undefined && { id_pgm }),
            ...(id_turno !== undefined && { id_turno }),
            ...(finalIdDetalleMembresia && { id_detalle_membresia: finalIdDetalleMembresia }),
            ...(comentario !== undefined && { comentario }),
        });

        // 5. Crear asistencia automática si no existe
        try {
            if (existingDay.length === 0) {
                console.log(`CREANDO ASISTENCIA AUTOMATICA: Cliente ${id_cliente}, Fecha ${fechaBase}`);
                await Asistencia.create({
                    id_cliente,
                    id_detalle_membresia: finalIdDetalleMembresia || null,
                    id_turno: id_turno || null,
                    fecha_ingreso: fechaBase,
                    metodo_ingreso: 'SISTEMA',
                    estado: true
                });
            }
        } catch (asistError) {
            console.error("ERROR NO BLOQUEANTE EN ASISTENCIA:", asistError.message);
        }

        const nuevoCompleto = await HistorialEntrenamiento.findByPk(nuevo.id, {
            include: [
                {
                    model: CatalogoEntrenamiento,
                    attributes: ["nombre", "descripcion", "es_maquina"],
                    include: [{ model: TipoEjercicio }]
                },
                { model: ProgramaTraining, attributes: ["id_pgm", "name_pgm"] },
                { model: TurnoGimnasio, attributes: ["id", "nombre", "hora_inicio", "hora_fin"] }
            ]
        });

        res.status(201).json({ ok: true, data: nuevoCompleto });

    } catch (error) {
        console.error("SAVE historial error:", error);
        res.status(500).json({ ok: false, msg: "Error al guardar historial", error: error.message });
    }
};

const updateHistorial = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { id_entrenamiento, fecha, series, repeticiones, peso, tiempo, id_pgm, id_turno, id_detalle_membresia, comentario } = req.body;

        const historial = await HistorialEntrenamiento.findByPk(id);
        if (!historial) {
            return res.status(404).json({ ok: false, msg: "Registro de historial no encontrado" });
        }

        let fechaStr;
        if (fecha !== undefined) {
            const parsed = parseFecha(fecha);
            fechaStr = parsed.fechaStr;
        }

        const oldDateStr = extractDateStr(historial.fecha);

        if (fechaStr && fechaStr !== oldDateStr) {
            if ((historial.date_edit_count || 0) >= 1) {
                return res.status(400).json({
                    ok: false,
                    msg: "La fecha ya ha sido corregida una vez y no puede modificarse nuevamente."
                });
            }
        }

        await historial.update({
            ...(id_entrenamiento !== undefined && { id_entrenamiento }),
            ...(fecha !== undefined && { fecha: fechaStr }),
            ...(fecha !== undefined && fechaStr !== oldDateStr && { date_edit_count: (historial.date_edit_count || 0) + 1 }),
            ...(series !== undefined && { series }),
            ...(repeticiones !== undefined && { repeticiones }),
            ...(peso !== undefined && { peso }),
            ...(tiempo !== undefined && { tiempo }),
            ...(id_pgm !== undefined && { id_pgm }),
            ...(id_turno !== undefined && { id_turno }),
            ...(id_detalle_membresia !== undefined && { id_detalle_membresia }),
            ...(comentario !== undefined && { comentario }),
        });

        // Sync Attendance Date if Changed
        if (fechaStr && fechaStr !== oldDateStr) {
            try {
                const targetExists = await Asistencia.findOne({
                    where: {
                        id_cliente: historial.id_cliente,
                        fecha_ingreso: fechaStr
                    },
                    attributes: ['id']
                });

                if (!targetExists) {
                    await Asistencia.create({
                        id_cliente: historial.id_cliente,
                        id_detalle_membresia: id_detalle_membresia || historial.id_detalle_membresia,
                        id_turno: id_turno || historial.id_turno,
                        fecha_ingreso: fechaStr,
                        metodo_ingreso: 'SISTEMA',
                        estado: true
                    });
                }

                const remainingCount = await HistorialEntrenamiento.count({
                    where: { id_cliente: historial.id_cliente, fecha: oldDateStr }
                });

                if (remainingCount === 0) {
                    await Asistencia.destroy({
                        where: { id_cliente: historial.id_cliente, fecha_ingreso: oldDateStr }
                    });
                }
            } catch (moveError) {
                console.error("Error moving attendance:", moveError);
            }
        }

        // Sync turno if changed
        if (id_turno !== undefined) {
            try {
                const dateToUpdate = fechaStr || oldDateStr;
                await Asistencia.update(
                    { id_turno: id_turno },
                    { where: { id_cliente: historial.id_cliente, fecha_ingreso: dateToUpdate } }
                );
            } catch (syncError) {
                console.error("Error syncing attendance turno:", syncError);
            }
        }

        res.json({ ok: true, data: historial });
    } catch (error) {
        console.error("UPDATE historial error:", error);
        res.status(500).json({ ok: false, msg: "Error al actualizar historial" });
    }
};

const getHistorialGlobal = async (req = request, res = response) => {
    try {
        const { from, to } = req.query;
        const whereClause = {};

        if (from && to) {
            const fromDate = new Date(from);
            const toDate = new Date(to);
            if (!isNaN(fromDate) && !isNaN(toDate)) {
                whereClause.fecha = { [Op.between]: [fromDate, toDate] };
            }
        }

        const historial = await HistorialEntrenamiento.findAll({
            where: whereClause,
            include: [
                {
                    model: Cliente,
                    attributes: ["id_cli", "nombre_cli", "apPaterno_cli", "apMaterno_cli", "numDoc_cli", "uid_avatar"]
                },
                {
                    model: CatalogoEntrenamiento,
                    attributes: ["nombre", "descripcion", "es_maquina"],
                    include: [{ model: TipoEjercicio }]
                },
                { model: ProgramaTraining, attributes: ["id_pgm", "name_pgm"] },
                { model: TurnoGimnasio, attributes: ["id", "nombre", "hora_inicio", "hora_fin"] }
            ],
            order: [["fecha", "DESC"]]
        });

        res.json({ ok: true, data: historial });
    } catch (error) {
        console.error("GET historial-global error:", error);
        res.status(500).json({ ok: false, msg: "Error al obtener historial global" });
    }
};

const getHistorialEvolutivo = async (req, res) => {
    try {
        const { id_cliente } = req.params;
        const { ResultadosReto } = require('../../models/ResultadosReto');

        const historial = await ResultadosReto.findAll({
            where: { id_cliente },
            order: [['fecha_registro_inicial', 'ASC']],
            include: [{
                model: Venta,
                include: [{
                    model: detalleVenta_membresias,
                    include: [
                        { model: ProgramaTraining },
                        { model: SemanasTraining }
                    ]
                }]
            }]
        });

        if (historial.length === 0) {
            return res.json({ ok: true, data: [], msg: "Cliente sin resultados registrados" });
        }

        const reporte = historial.map((reto, index) => {
            let analisis_intermedio = "Primer Reto";
            let diferencia_kilos_vacaciones = 0;

            if (index > 0) {
                const retoAnterior = historial[index - 1];
                const pesoFinAnterior = parseFloat(retoAnterior.peso_final || 0);
                const pesoInicioActual = parseFloat(reto.peso_inicial || 0);

                if (pesoFinAnterior > 0) {
                    diferencia_kilos_vacaciones = pesoInicioActual - pesoFinAnterior;
                    if (diferencia_kilos_vacaciones > 0) {
                        analisis_intermedio = `\u26a0\ufe0f Subi\u00f3 ${diferencia_kilos_vacaciones.toFixed(2)}kg desde el \u00faltimo reto`;
                    } else if (diferencia_kilos_vacaciones < 0) {
                        analisis_intermedio = `\u2705 Sigui\u00f3 bajando ${Math.abs(diferencia_kilos_vacaciones).toFixed(2)}kg por su cuenta`;
                    } else {
                        analisis_intermedio = `\u2728 Mantuvo el peso exacto`;
                    }
                }
            }

            const ventaData = reto.Venta || reto.tb_ventum;
            const detalleMembresia = ventaData?.detalle_ventaMembresia?.[0];
            const nombrePrograma = detalleMembresia?.ProgramaTraining?.name_pgm || "Plan";
            const semanaTraining = detalleMembresia?.tb_semana_training || detalleMembresia?.SemanasTraining;
            const semanasPlan = semanaTraining?.semanas_st || 0;

            return {
                ...reto.toJSON(),
                programa_nombre_calculado: nombrePrograma,
                semanas_plan: semanasPlan,
                transicion_calculada: {
                    diferencia: diferencia_kilos_vacaciones.toFixed(2),
                    mensaje: analisis_intermedio,
                    es_rebote: diferencia_kilos_vacaciones > 0,
                    es_primer_reto: index === 0
                }
            };
        });

        res.json({ ok: true, data: reporte });

    } catch (error) {
        console.error("GET evolutivo error:", error);
        res.status(500).json({ ok: false, msg: "Error al obtener historial evolutivo" });
    }
};

module.exports = {
    getHistorialByCliente,
    saveHistorial,
    updateHistorial,
    getHistorialGlobal,
    getHistorialEvolutivo,
};
