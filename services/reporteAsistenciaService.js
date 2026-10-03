// services/reporteAsistenciaService.js
// Reporte de asistencia por huellero: une las marcaciones (zk_Transactions), las personas del
// huellero (zk_Users) y los clientes (tb_clientes) por DNI (tb_clientes.numDoc_cli = zk_Users.dni),
// y usa los seguimientos (tb_seguimientos -> membresía -> programa) para saber a qué programa
// asistió cada cliente cada día (el programa de la membresía vigente ese día).
const { sql, poolPromise } = require("../database/connectionSQLserver");

const SIN_MEMBRESIA = "Sin membresía vigente";
const NO_ES_CLIENTE = "No es cliente";

const normalizarDoc = (doc) => (doc === null || doc === undefined ? "" : String(doc).trim());
const soloFecha = (fecha) => (fecha ? new Date(fecha).toISOString().slice(0, 10) : null);

// Sesiones que le quedan: días de lunes a viernes desde `dia` hasta `vence`, ambos incluidos
// (los planes son de 5 sesiones por semana). null si no hay vencimiento.
function sesionesHastaVencimiento(dia, vence) {
  if (!dia || !vence || vence < dia) return vence && dia ? 0 : null;
  let sesiones = 0;
  const d = new Date(`${dia}T00:00:00Z`);
  const fin = new Date(`${vence}T00:00:00Z`);
  while (d <= fin) {
    const diaSemana = d.getUTCDay();
    if (diaSemana >= 1 && diaSemana <= 5) sesiones++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return sesiones;
}

// Días (YYYY-MM-DD) entre desde y hasta, ambos incluidos
function diasDelRango(desde, hasta) {
  const dias = [];
  const dia = new Date(`${desde}T00:00:00Z`);
  const fin = new Date(`${hasta}T00:00:00Z`);
  while (dia <= fin) {
    dias.push(dia.toISOString().slice(0, 10));
    dia.setUTCDate(dia.getUTCDate() + 1);
  }
  return dias;
}

/// Arma el reporte a partir de los datos ya leídos (función pura, sin BD).
/// - marcaciones: [{ pin, dia ('YYYY-MM-DD' en Perú), hora ('HH:mm:ss'), marcacion (Date) }]
/// - personas:    [{ pin, nombre, dni, huellas }]                      (zk_Users)
/// - clientes:    [{ id_cli, nombre, doc, telefono }]                   (tb_clientes activos)
/// - membresias:  [{ id_cli, id_pgm, programa, inicio, vence }]         (seguimientos, fechas YYYY-MM-DD)
/// - docsEmpleados: documentos de los empleados activos (tb_empleados). Quien es empleado no cuenta
///   como cliente aunque también esté registrado en tb_clientes (ej. personal que se registró como cliente).
function armarReporte({ marcaciones, personas, clientes, membresias, docsEmpleados = [], desde, hasta }) {
  const esEmpleado = new Set([...docsEmpleados].map(normalizarDoc).filter(Boolean));
  // Membresías por cliente, la más reciente primero
  const membresiasPorCliente = new Map();
  for (const m of membresias) {
    const lista = membresiasPorCliente.get(m.id_cli) || [];
    lista.push(m);
    membresiasPorCliente.set(m.id_cli, lista);
  }
  for (const lista of membresiasPorCliente.values()) lista.sort((a, b) => (a.inicio < b.inicio ? 1 : -1));
  const membresiaEn = (id_cli, dia) =>
    (membresiasPorCliente.get(id_cli) || []).find((m) => m.inicio <= dia && dia <= m.vence) || null;

  // Un cliente por documento: hay documentos repetidos en tb_clientes; se prefiere el que tiene
  // membresía y, entre esos, el registro más reciente
  const clientePorDoc = new Map();
  for (const c of clientes) {
    const doc = normalizarDoc(c.doc);
    if (!doc || esEmpleado.has(doc)) continue; // los empleados no se cuentan como clientes
    const actual = clientePorDoc.get(doc);
    const tieneMem = membresiasPorCliente.has(c.id_cli);
    const actualTieneMem = actual && membresiasPorCliente.has(actual.id_cli);
    if (!actual || (tieneMem && !actualTieneMem) || (tieneMem === actualTieneMem && c.id_cli > actual.id_cli)) {
      clientePorDoc.set(doc, c);
    }
  }

  const personaPorPin = new Map(personas.map((p) => [p.pin, p]));
  const clienteDePin = (pin) => {
    const persona = personaPorPin.get(pin);
    const doc = normalizarDoc(persona?.dni);
    return doc ? clientePorDoc.get(doc) || null : null;
  };

  // Programas en orden fijo (por id) para que cada uno conserve su color en el gráfico
  const programas = new Map();
  for (const m of membresias) if (m.programa) programas.set(m.id_pgm, m.programa);
  const ordenProgramas = [...programas.entries()].sort((a, b) => a[0] - b[0]).map(([, nombre]) => nombre);
  // La asistencia (curva, detalle e indicadores) es solo de clientes, tengan o no membresía vigente
  const categorias = [...ordenProgramas, SIN_MEMBRESIA];

  // --- Curva diaria: clientes distintos que marcaron cada día, por programa ---
  const dias = diasDelRango(desde, hasta);
  const porDia = new Map(dias.map((d) => [d, { pins: new Set(), marcaciones: 0, porCategoria: new Map() }]));
  const resumenPorPin = new Map(); // pin -> { marcaciones, dias:Set, ultima } (de todos, para la tabla unificada)
  const llegadas = new Map(); // dia -> Map(pin -> { llegada, marcaciones })
  for (const m of marcaciones) {
    const dia = porDia.get(m.dia);
    if (!dia) continue;

    const r = resumenPorPin.get(m.pin) || { marcaciones: 0, dias: new Set(), ultima: null };
    r.marcaciones++;
    r.dias.add(m.dia);
    if (!r.ultima || m.marcacion > r.ultima.marcacion) r.ultima = m;
    resumenPorPin.set(m.pin, r);

    const cliente = clienteDePin(m.pin);
    if (!cliente) continue; // personas del huellero que no son clientes (ej. personal)

    dia.marcaciones++;
    dia.pins.add(m.pin);

    // Hora de llegada = primera marcación del día
    const delDia = llegadas.get(m.dia) || new Map();
    const actual = delDia.get(m.pin) || { llegada: m.hora, marcaciones: 0 };
    actual.marcaciones++;
    if (m.hora < actual.llegada) actual.llegada = m.hora;
    delDia.set(m.pin, actual);
    llegadas.set(m.dia, delDia);

    const categoria = membresiaEn(cliente.id_cli, m.dia)?.programa || SIN_MEMBRESIA;
    const set = dia.porCategoria.get(categoria) || new Set();
    set.add(m.pin);
    dia.porCategoria.set(categoria, set);
  }

  const serieDiaria = dias.map((d) => {
    const dia = porDia.get(d);
    return {
      fecha: d,
      personas: dia.pins.size,
      marcaciones: dia.marcaciones,
      porCategoria: Object.fromEntries(categorias.map((c) => [c, dia.porCategoria.get(c)?.size || 0])),
    };
  });

  // --- Detalle de cada día: quién asistió, programa, hora de llegada y sesiones que le quedan ---
  const detallePorDia = {};
  for (const [fecha, delDia] of llegadas) {
    detallePorDia[fecha] = [...delDia.entries()]
      .map(([pin, l]) => {
        const persona = personaPorPin.get(pin);
        const cliente = clienteDePin(pin); // en llegadas solo hay clientes
        const membresia = membresiaEn(cliente.id_cli, fecha);
        return {
          pin,
          dni: normalizarDoc(cliente.doc),
          id_cli: cliente.id_cli,
          cliente: cliente.nombre,
          nombreHuellero: persona?.nombre ?? null,
          programa: membresia?.programa ?? null,
          vence: membresia?.vence ?? null,
          horaLlegada: l.llegada,
          marcaciones: l.marcaciones,
          sesionesRestantes: membresia ? sesionesHastaVencimiento(fecha, membresia.vence) : null,
          categoria: membresia?.programa || SIN_MEMBRESIA,
        };
      })
      .sort((a, b) => (a.horaLlegada < b.horaLlegada ? -1 : 1));
  }

  // --- Tabla unificada por DNI ---
  // Filas: clientes con membresía vigente en algún día del rango + todas las personas del huellero
  const filas = new Map(); // clave: doc del cliente o "pin:<pin>" si la persona no es cliente
  const vigenteEnRango = (id_cli) =>
    (membresiasPorCliente.get(id_cli) || []).find((m) => m.inicio <= hasta && m.vence >= desde) || null;

  for (const c of clientePorDoc.values()) {
    const membresia = vigenteEnRango(c.id_cli);
    if (!membresia) continue;
    filas.set(normalizarDoc(c.doc), { cliente: c, persona: null, membresia });
  }
  for (const p of personas) {
    const doc = normalizarDoc(p.dni);
    const cliente = doc ? clientePorDoc.get(doc) || null : null;
    const clave = cliente ? normalizarDoc(cliente.doc) : `pin:${p.pin}`;
    const fila = filas.get(clave) || { cliente, persona: null, membresia: cliente ? vigenteEnRango(cliente.id_cli) : null };
    fila.persona = p;
    filas.set(clave, fila);
  }

  const personasUnificadas = [...filas.values()].map(({ cliente, persona, membresia }) => {
    const resumen = persona ? resumenPorPin.get(persona.pin) : null;
    const estado = !cliente
      ? esEmpleado.has(normalizarDoc(persona?.dni))
        ? "empleado"
        : "huellero_sin_cliente"
      : !persona
        ? "cliente_sin_huellero"
        : "cliente_en_huellero";
    return {
      dni: cliente ? normalizarDoc(cliente.doc) : normalizarDoc(persona?.dni) || null,
      id_cli: cliente?.id_cli ?? null,
      cliente: cliente?.nombre ?? null,
      telefono: cliente?.telefono ?? null,
      programa: membresia?.programa ?? null,
      vence: membresia?.vence ?? null,
      pin: persona?.pin ?? null,
      nombreHuellero: persona?.nombre ?? null,
      huellas: persona?.huellas ?? 0,
      marcaciones: resumen?.marcaciones ?? 0,
      diasAsistidos: resumen?.dias.size ?? 0,
      ultimaMarcacion: resumen?.ultima ? `${resumen.ultima.dia} ${resumen.ultima.hora}` : null,
      estado,
    };
  });
  personasUnificadas.sort((a, b) => b.marcaciones - a.marcaciones || String(a.cliente || a.nombreHuellero).localeCompare(String(b.cliente || b.nombreHuellero)));

  // Clientes distintos que asistieron en el rango (no cuenta a empleados ni a quienes no son clientes)
  const totalPersonas = new Set([...porDia.values()].flatMap((d) => [...d.pins])).size;
  return {
    desde,
    hasta,
    categorias,
    serieDiaria,
    detallePorDia,
    personas: personasUnificadas,
    resumen: {
      personasDistintas: totalPersonas,
      marcaciones: serieDiaria.reduce((acc, d) => acc + d.marcaciones, 0),
      promedioDiario: dias.length ? Math.round((serieDiaria.reduce((acc, d) => acc + d.personas, 0) / dias.length) * 10) / 10 : 0,
      clientesVigentesSinHuellero: personasUnificadas.filter((p) => p.estado === "cliente_sin_huellero").length,
      huelleroSinCliente: personasUnificadas.filter((p) => p.estado === "huellero_sin_cliente").length,
      empleadosEnHuellero: personasUnificadas.filter((p) => p.estado === "empleado").length,
    },
  };
}

/// Lee de la BD y arma el reporte de asistencia entre dos fechas de Perú (YYYY-MM-DD).
async function obtenerReporte(desde, hasta) {
  const pool = await poolPromise;
  const inicio = new Date(`${desde}T00:00:00-05:00`);
  const fin = new Date(`${hasta}T00:00:00-05:00`);
  fin.setUTCDate(fin.getUTCDate() + 1);

  const [marc, pers, cli, mem, emp] = await Promise.all([
    pool
      .request()
      .input("inicio", sql.DateTimeOffset, inicio)
      .input("fin", sql.DateTimeOffset, fin)
      .query(`
        SELECT t.UserCode AS pin, t.PunchTime AS marcacion,
               CONVERT(char(10), SWITCHOFFSET(t.PunchTime, '-05:00'), 23) AS dia,
               CONVERT(char(8), SWITCHOFFSET(t.PunchTime, '-05:00'), 108) AS hora
        FROM dbo.zk_Transactions t
        WHERE t.PunchTime >= @inicio AND t.PunchTime < @fin
      `),
    pool.request().query(`
      SELECT u.UserCode AS pin, RTRIM(u.Name) AS nombre, LTRIM(RTRIM(u.dni)) AS dni,
             (SELECT COUNT(*) FROM dbo.zk_UserData64 h WHERE h.UserCode = u.UserCode AND h.DataLabel = 'FP') AS huellas
      FROM dbo.zk_Users u
    `),
    pool.request().query(`
      SELECT c.id_cli,
             LTRIM(RTRIM(CONCAT(c.nombre_cli, ' ', c.apPaterno_cli, ' ', c.apMaterno_cli))) AS nombre,
             LTRIM(RTRIM(c.numDoc_cli)) AS doc, c.tel_cli AS telefono
      FROM dbo.tb_clientes c
      WHERE c.flag = 1 AND c.numDoc_cli IS NOT NULL AND LTRIM(RTRIM(c.numDoc_cli)) <> ''
    `),
    pool.request().query(`
      SELECT s.id_cli, m.id_pgm, RTRIM(p.name_pgm) AS programa, m.fecha_inicio AS inicio, s.fecha_vencimiento AS vence
      FROM dbo.tb_seguimientos s
      JOIN dbo.detalle_ventaMembresia m ON m.id = s.id_membresia
      LEFT JOIN dbo.tb_ProgramaTraining p ON p.id_pgm = m.id_pgm
      WHERE s.flag = 1 AND m.fecha_inicio IS NOT NULL AND s.fecha_vencimiento IS NOT NULL
    `),
    // Empleados activos: no cuentan como clientes aunque también estén en tb_clientes
    pool.request().query(`
      SELECT DISTINCT LTRIM(RTRIM(e.numDoc_empl)) AS doc
      FROM dbo.tb_empleados e
      WHERE e.flag = 1 AND e.numDoc_empl IS NOT NULL AND LTRIM(RTRIM(e.numDoc_empl)) <> ''
    `),
  ]);

  return armarReporte({
    marcaciones: marc.recordset.map((m) => ({ ...m, dia: m.dia.trim(), hora: m.hora.trim() })),
    personas: pers.recordset,
    clientes: cli.recordset,
    membresias: mem.recordset.map((m) => ({ ...m, inicio: soloFecha(m.inicio), vence: soloFecha(m.vence) })),
    docsEmpleados: emp.recordset.map((e) => e.doc),
    desde,
    hasta,
  });
}

module.exports = {
  SIN_MEMBRESIA,
  NO_ES_CLIENTE,
  diasDelRango,
  sesionesHastaVencimiento,
  armarReporte,
  obtenerReporte,
};
