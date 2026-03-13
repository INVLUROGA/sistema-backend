/**
 * Utilidades para manejo seguro de fechas en entrenamientos.
 * Evita problemas de timezone y parseo inconsistente.
 */

/**
 * Parsea una fecha desde múltiples formatos al formato estándar.
 * @param {string|Date|undefined} fecha - Fecha en formato dd/mm/yyyy, yyyy-mm-dd, Date object, o undefined (hoy)
 * @returns {{ fechaStr: string, fechaDate: Date }} - fechaStr en YYYY-MM-DD, fechaDate como Date local
 */
const parseFecha = (fecha) => {
    let fechaStr = '';
    let fechaDate = new Date();

    if (fecha) {
        if (typeof fecha === 'string') {
            if (fecha.includes('/')) {
                // dd/mm/yyyy [HH:mm:ss]
                const [fechaPart] = fecha.split(' ');
                const [dia, mes, anio] = fechaPart.split('/');
                fechaStr = `${anio}-${mes}-${dia}`;
                fechaDate = new Date(`${anio}-${mes}-${dia}T00:00:00`);
            } else if (fecha.match(/^\d{4}-\d{2}-\d{2}/)) {
                // YYYY-MM-DD...
                fechaStr = fecha.substring(0, 10);
                const [y, m, d] = fechaStr.split('-').map(Number);
                fechaDate = new Date(y, m - 1, d);
            } else {
                // Fallback
                fechaDate = new Date(fecha);
                const year = fechaDate.getFullYear();
                const month = String(fechaDate.getMonth() + 1).padStart(2, '0');
                const day = String(fechaDate.getDate()).padStart(2, '0');
                fechaStr = `${year}-${month}-${day}`;
            }
        } else {
            // Date object
            fechaDate = fecha;
            const year = fechaDate.getFullYear();
            const month = String(fechaDate.getMonth() + 1).padStart(2, '0');
            const day = String(fechaDate.getDate()).padStart(2, '0');
            fechaStr = `${year}-${month}-${day}`;
        }
    } else {
        // Sin fecha → hoy
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        fechaStr = `${year}-${month}-${day}`;
        fechaDate = now;
    }

    return { fechaStr, fechaDate };
};

/**
 * Formatea una fecha al formato español dd/mm/yyyy
 * @param {Date} date 
 * @returns {string}
 */
const formatDateEs = (date) => {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Formatea una fecha al formato corto dd/mm
 * @param {Date} date 
 * @returns {string}
 */
const formatDateEsShort = (date) => {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
};

/**
 * Extrae la cadena YYYY-MM-DD de un valor de fecha (string o Date).
 * Maneja correctamente valores de columna DATE de la BD.
 * @param {string|Date} fecha 
 * @returns {string} YYYY-MM-DD
 */
const extractDateStr = (fecha) => {
    if (!fecha) return '';
    if (typeof fecha === 'string') {
        return fecha.substring(0, 10);
    }
    // Date object (posiblemente UTC desde la BD)
    const d = new Date(fecha);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Calcula el índice de semana y rango de la semana actual
 * basado en la fecha de inicio de la membresía.
 * @param {Date} fechaInicioMem - Fecha de inicio de la membresía
 * @param {Date} fechaActual - Fecha del intento de asistencia
 * @returns {{ weekIndex: number, weekStart: Date, weekEnd: Date } | null}
 */
const calcularSemana = (fechaInicioMem, fechaActual) => {
    const startMem = new Date(fechaInicioMem);
    const attemptDate = new Date(fechaActual);

    const diffTime = attemptDate.getTime() - startMem.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return null;

    const weekIndex = Math.floor(diffDays / 7);

    const weekStart = new Date(startMem);
    weekStart.setDate(weekStart.getDate() + (weekIndex * 7));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(0, 0, 0, 0);

    return { weekIndex, weekStart, weekEnd };
};

module.exports = {
    parseFecha,
    formatDateEs,
    formatDateEsShort,
    extractDateStr,
    calcularSemana,
};
