const { request, response } = require("express");
const { ResultadosReto } = require("../models/ResultadosReto");
const { Venta, detalleVenta_membresias } = require("../models/Venta");
const HistorialEntrenamiento = require("../models/HistorialEntrenamientos");
const { Op, literal } = require("sequelize");

// --- HELPER 1: LIMPIAR DATOS ---
const cleanPayload = (data) => {
    const cleaned = {};
    for (const key in data) {
        let value = data[key];
        // Convertimos vacíos y "null" texto a NULL real
        if (value === "" || value === "null" || value === undefined) {
            cleaned[key] = null;
        } else {
            cleaned[key] = value;
        }
    }
    return cleaned;
};

// --- HELPER 2: FECHAS SEGURAS (CORREGIDO Y BLINDADO) ---
const formatDateForSQL = (dateInput) => {
    if (!dateInput) return null;

    let isoString = '';

    // 1. Obtener el string base ISO
    if (typeof dateInput === 'string') {
        // Si ya es string, lo usamos
        isoString = dateInput;
    } else {
        // Si es objeto Date, lo convertimos
        try {
            const d = new Date(dateInput);
            if (isNaN(d.getTime())) return null;
            isoString = d.toISOString(); // Ej: 2023-06-14T23:22:00.000Z
        } catch (e) { return null; }
    }

    // 2. CASO ESPECIAL: Fecha corta del Frontend (YYYY-MM-DD)
    if (isoString.length === 10) {
        return `${isoString} 12:00:00`;
    }

    // 3. LIMPIEZA AGRESIVA:
    // Cortamos en el caracter 19 para eliminar milisegundos y zona horaria (+00:00 o Z)
    // Y cambiamos la 'T' por espacio.
    // Entrada: '2023-06-14T23:22:00.000Z' o '2023-06-14 23:22:00.000 +00:00'
    // Salida:  '2023-06-14 23:22:00'
    return isoString.slice(0, 19).replace('T', ' ');
};

const saveResultados = async (req = request, res = response) => {
    try {
        // 1. LIMPIAR DATOS
        const bodyLimpio = cleanPayload(req.body);

        const {
            id_cliente,
            id_venta: idVentaBody, // Extraer id_venta del body
            peso_inicial, grasa_inicial, musculo_inicial, foto_inicial, foto_inicio_frontal,
            peso_final, grasa_final, musculo_final, foto_final, foto_fin_frontal,
            comentarios,
            fecha_registro_final,
            fecha_registro_inicial // <--- AÑADIDO PARA UPDATE
        } = bodyLimpio;

        // 2. VALIDAR MEMBRESÍA
        let id_venta = idVentaBody;

        if (!id_venta) {
            // FALLBACK: Buscar la última membresía activa (Comportamiento Legacy)
            const sales = await Venta.findAll({
                where: { id_cli: id_cliente, flag: true },
                include: [{ model: detalleVenta_membresias, required: true }],
                order: [['fecha_venta', 'DESC']],
                limit: 1
            });

            if (!sales || sales.length === 0) {
                return res.status(400).json({ ok: false, msg: "El cliente no tiene una membresía activa." });
            }
            id_venta = sales[0].id;
        } else {
            // VALIDAR QUE LA VENTA EXISTA Y PERTENEZCA AL CLIENTE (Seguridad básica)
            const ventaCheck = await Venta.findOne({ where: { id: id_venta, id_cli: id_cliente } });
            if (!ventaCheck) {
                return res.status(400).json({ ok: false, msg: "La venta especificada no pertenece al cliente." });
            }
        }
        let fechaFinValor;

        if (fecha_registro_final) {
            fechaFinValor = literal(`'${formatDateForSQL(fecha_registro_final)}'`);
        } else if (peso_final !== null) {
            fechaFinValor = literal('GETDATE()');
        }

        let reto = await ResultadosReto.findOne({ where: { id_cliente, id_venta } });

        if (reto) {
            const updateData = {
                peso_inicial,
                grasa_inicial,
                musculo_inicial,
                peso_final,
                grasa_final,
                musculo_final,
                comentarios: comentarios || ""
            };

            if (typeof foto_inicial === 'string') {
                updateData.foto_inicial = foto_inicial;
            }

            if (typeof foto_final === 'string') {
                updateData.foto_final = foto_final;
            }

            if (typeof foto_inicio_frontal === 'string') {
                updateData.foto_inicio_frontal = foto_inicio_frontal;
            }

            if (typeof foto_fin_frontal === 'string') {
                updateData.foto_fin_frontal = foto_fin_frontal;
            }

            if (fechaFinValor !== undefined) {
                updateData.fecha_registro_final = fechaFinValor;
            }

            // NUEVO: Permitir editar fecha inicio
            if (fecha_registro_inicial) {
                updateData.fecha_registro_inicial = literal(`'${formatDateForSQL(fecha_registro_inicial)}'`);
            }

            await reto.update(updateData);

        } else {
            // === CREAR ===
            const firstTraining = await HistorialEntrenamiento.findOne({
                where: { id_cliente }, order: [['fecha', 'ASC']], attributes: ['fecha']
            });

            let fechaInicioValor;

            if (firstTraining && firstTraining.fecha) {
                fechaInicioValor = literal(`'${formatDateForSQL(firstTraining.fecha)}'`);
            } else {
                fechaInicioValor = literal('GETDATE()');
            }


            const createData = {
                id_cliente, id_venta,
                peso_inicial, grasa_inicial, musculo_inicial,
                foto_inicial, foto_inicio_frontal,
                fecha_registro_inicial: fechaInicioValor,
                peso_final, grasa_final, musculo_final,
                foto_final, foto_fin_frontal,
                comentarios: comentarios || "",
                flag: true
            };

            if (fechaFinValor !== undefined) createData.fecha_registro_final = fechaFinValor;

            reto = await ResultadosReto.create(createData);
        }

        res.json({ ok: true, msg: "Guardado correctamente", data: reto });

    } catch (error) {
        console.error("ERROR BACKEND:", error);
        res.status(500).json({ ok: false, msg: "Error al guardar", error: error.message });
    }
};

module.exports = { saveResultados };