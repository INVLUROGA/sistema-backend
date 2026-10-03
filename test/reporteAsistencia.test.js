// Tests del reporte de asistencia (services/reporteAsistenciaService.armarReporte):
// une marcaciones, personas del huellero y clientes por DNI, y asigna el programa vigente cada día.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const rutaConexion = path.resolve(__dirname, "../database/connectionSQLserver.js");
require.cache[rutaConexion] = {
  id: rutaConexion,
  filename: rutaConexion,
  loaded: true,
  exports: { poolPromise: Promise.resolve({}), sql: require("mssql") },
};

const { armarReporte, diasDelRango, sesionesHastaVencimiento, SIN_MEMBRESIA, NO_ES_CLIENTE } = require("../services/reporteAsistenciaService");

const marc = (pin, dia, hora = "08:00:00") => ({ pin, dia, hora, marcacion: new Date(`${dia}T${hora}-05:00`) });

const DATOS = {
  desde: "2026-10-01",
  hasta: "2026-10-03",
  personas: [
    { pin: 11111111, nombre: "Ana H", dni: "11111111", huellas: 2 },
    { pin: 1077314, nombre: "Beto H", dni: "01077314", huellas: 1 }, // DNI con 0 inicial
    { pin: 99, nombre: "Staff", dni: "99", huellas: 1 }, // sin cliente
    { pin: 44444444, nombre: "Eva H", dni: "44444444", huellas: 1 }, // cliente sin ninguna membresía
  ],
  clientes: [
    { id_cli: 1, nombre: "ANA PEREZ (antigua)", doc: "11111111", telefono: "900" },
    { id_cli: 2, nombre: "ANA PEREZ", doc: " 11111111 ", telefono: "901" }, // mismo documento, con membresía
    { id_cli: 3, nombre: "BETO ROJAS", doc: "01077314", telefono: "902" },
    { id_cli: 4, nombre: "CARLA SIN HUELLA", doc: "22222222", telefono: "903" },
    { id_cli: 5, nombre: "DANI SIN MEMBRESIA", doc: "33333333", telefono: "904" },
    { id_cli: 6, nombre: "EVA SIN MEMBRESIA", doc: "44444444", telefono: "905" },
  ],
  membresias: [
    // Ana cambia de programa el día 2
    { id_cli: 2, id_pgm: 2, programa: "CHANGE 45", inicio: "2026-08-01", vence: "2026-10-01" },
    { id_cli: 2, id_pgm: 3, programa: "FS 45", inicio: "2026-10-02", vence: "2026-12-31" },
    { id_cli: 3, id_pgm: 2, programa: "CHANGE 45", inicio: "2026-09-01", vence: "2026-12-31" },
    { id_cli: 4, id_pgm: 3, programa: "FS 45", inicio: "2026-09-15", vence: "2026-11-15" },
    { id_cli: 5, id_pgm: 3, programa: "FS 45", inicio: "2025-01-01", vence: "2025-03-01" }, // vencida
  ],
  marcaciones: [
    marc(11111111, "2026-10-01", "07:00:00"),
    marc(11111111, "2026-10-01", "08:30:00"), // misma persona, mismo día: cuenta 1 persona
    marc(11111111, "2026-10-02", "19:00:00"),
    marc(1077314, "2026-10-02"),
    marc(99, "2026-10-02"), // no es cliente: no cuenta en la asistencia
    marc(44444444, "2026-10-02", "09:15:00"), // cliente sin membresía: sí cuenta
    marc(11111111, "2026-09-30"), // fuera del rango
  ],
};

test("curva diaria: solo clientes (con o sin membresía), por programa vigente ese día", () => {
  const r = armarReporte(DATOS);

  // Programas en orden fijo por id + "Sin membresía vigente"; no hay categoría "No es cliente"
  assert.deepEqual(r.categorias, ["CHANGE 45", "FS 45", SIN_MEMBRESIA]);
  assert.equal(r.categorias.includes(NO_ES_CLIENTE), false);
  assert.deepEqual(
    r.serieDiaria.map((d) => [d.fecha, d.personas, d.marcaciones]),
    [
      ["2026-10-01", 1, 2],
      ["2026-10-02", 3, 3], // Ana, Beto y Eva; el personal (pin 99) no cuenta
      ["2026-10-03", 0, 0], // los días sin marcaciones también aparecen
    ]
  );
  // Ana marcó el 1 con CHANGE 45 y el 2 con FS 45 (cambió de membresía); Eva, sin membresía
  assert.deepEqual(r.serieDiaria[0].porCategoria, { "CHANGE 45": 1, "FS 45": 0, [SIN_MEMBRESIA]: 0 });
  assert.deepEqual(r.serieDiaria[1].porCategoria, { "CHANGE 45": 1, "FS 45": 1, [SIN_MEMBRESIA]: 1 });
  assert.deepEqual(r.resumen, {
    personasDistintas: 3,
    marcaciones: 5,
    promedioDiario: 1.3, // (1 + 3 + 0) / 3
    clientesVigentesSinHuellero: 1,
    huelleroSinCliente: 1,
    empleadosEnHuellero: 0,
  });
});

test("tabla unificada por DNI: cliente + huellero, sin duplicar documentos", () => {
  const r = armarReporte(DATOS);
  const porDni = Object.fromEntries(r.personas.map((p) => [p.dni, p]));

  // Documento repetido en clientes: se usa el que tiene membresía (id_cli 2)
  assert.equal(r.personas.filter((p) => p.dni === "11111111").length, 1);
  assert.deepEqual(
    {
      id_cli: porDni["11111111"].id_cli,
      programa: porDni["11111111"].programa,
      pin: porDni["11111111"].pin,
      marcaciones: porDni["11111111"].marcaciones,
      diasAsistidos: porDni["11111111"].diasAsistidos,
      ultima: porDni["11111111"].ultimaMarcacion,
      estado: porDni["11111111"].estado,
    },
    { id_cli: 2, programa: "FS 45", pin: 11111111, marcaciones: 3, diasAsistidos: 2, ultima: "2026-10-02 19:00:00", estado: "cliente_en_huellero" }
  );
  // El DNI con 0 inicial coincide con el documento del cliente
  assert.equal(porDni["01077314"].cliente, "BETO ROJAS");
  // Cliente con membresía vigente pero sin persona en el huellero
  assert.deepEqual(
    { estado: porDni["22222222"].estado, pin: porDni["22222222"].pin, marcaciones: porDni["22222222"].marcaciones },
    { estado: "cliente_sin_huellero", pin: null, marcaciones: 0 }
  );
  // Persona del huellero que no es cliente
  assert.deepEqual({ estado: porDni["99"].estado, cliente: porDni["99"].cliente }, { estado: "huellero_sin_cliente", cliente: null });
  // Cliente con la membresía vencida y sin huellero: no aparece
  assert.equal(porDni["33333333"], undefined);
  // Ordenado por cantidad de marcaciones
  assert.equal(r.personas[0].dni, "11111111");
});

test("diasDelRango incluye ambos extremos y cruza de mes", () => {
  assert.deepEqual(diasDelRango("2026-09-29", "2026-10-02"), ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
  assert.deepEqual(diasDelRango("2026-10-02", "2026-10-02"), ["2026-10-02"]);
});

test("detalle por día: quién asistió, programa, hora de llegada y sesiones que le quedan", () => {
  const r = armarReporte(DATOS);

  // Día 1: solo Ana; llegó a las 07:00 (primera de sus 2 marcaciones), su membresía vence ese mismo día
  assert.deepEqual(r.detallePorDia["2026-10-01"], [
    {
      pin: 11111111,
      dni: "11111111",
      id_cli: 2,
      cliente: "ANA PEREZ",
      nombreHuellero: "Ana H",
      programa: "CHANGE 45",
      vence: "2026-10-01",
      horaLlegada: "07:00:00",
      marcaciones: 2,
      sesionesRestantes: 1, // jueves 01/10, el último día
      categoria: "CHANGE 45",
    },
  ]);

  // Día 2: solo clientes, ordenados por hora de llegada; Ana ya está en FS 45; Eva sin membresía;
  // el personal (pin 99, no es cliente) no aparece
  const dia2 = r.detallePorDia["2026-10-02"];
  assert.deepEqual(
    dia2.map((p) => [p.cliente, p.programa, p.horaLlegada, p.sesionesRestantes, p.categoria]),
    [
      ["BETO ROJAS", "CHANGE 45", "08:00:00", 65, "CHANGE 45"],
      ["EVA SIN MEMBRESIA", null, "09:15:00", null, SIN_MEMBRESIA],
      ["ANA PEREZ", "FS 45", "19:00:00", 65, "FS 45"],
    ]
  );
  assert.equal(dia2.some((p) => p.pin === 99), false);
  // Sin marcaciones ese día: no hay detalle
  assert.equal(r.detallePorDia["2026-10-03"], undefined);
});

test("sesiones hasta el vencimiento: lunes a viernes, incluyendo el día consultado", () => {
  assert.equal(sesionesHastaVencimiento("2026-10-01", "2026-12-28"), 63);
  assert.equal(sesionesHastaVencimiento("2026-10-03", "2026-10-04"), 0); // sábado y domingo
  assert.equal(sesionesHastaVencimiento("2026-10-05", "2026-10-05"), 1); // lunes, último día
  assert.equal(sesionesHastaVencimiento("2026-10-05", null), null);
});

test("un empleado activo no cuenta como cliente aunque también esté registrado en tb_clientes", () => {
  // Deysi: empleada activa que además se registró como cliente (sin membresía) y marca en el huellero
  const datos = {
    ...DATOS,
    personas: [...DATOS.personas, { pin: 46342044, nombre: "Deysi H", dni: "46342044", huellas: 1 }],
    clientes: [...DATOS.clientes, { id_cli: 7376, nombre: "DEYSI SOBRINO", doc: "46342044", telefono: "906" }],
    marcaciones: [...DATOS.marcaciones, marc(46342044, "2026-10-02", "05:30:00")],
    docsEmpleados: [" 46342044 "],
  };
  const r = armarReporte(datos);

  // No aparece en la curva, el detalle ni los indicadores de asistencia
  assert.equal(r.serieDiaria[1].personas, 3); // Ana, Beto y Eva (igual que sin ella)
  assert.equal(r.detallePorDia["2026-10-02"].some((p) => p.pin === 46342044), false);
  assert.equal(r.resumen.personasDistintas, 3);

  // En la tabla unificada figura como empleado, no como cliente
  const deysi = r.personas.find((p) => p.pin === 46342044);
  assert.deepEqual({ estado: deysi.estado, cliente: deysi.cliente, marcaciones: deysi.marcaciones }, { estado: "empleado", cliente: null, marcaciones: 1 });
  assert.equal(r.resumen.empleadosEnHuellero, 1);
});
