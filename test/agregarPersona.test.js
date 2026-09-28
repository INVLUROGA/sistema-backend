// Tests de POST /api/eventos-asistencia/personas (alta manual: nombre + DNI + huella en texto)
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// BD falsa: usuarios, huellas y cola de comandos en memoria
const usuarios = new Map();
const huellas = new Map();
const cola = [];
let fallarHuella = false;
const DISPOSITIVOS = ["CRJP230860129", "CRJP230860136"];
const fakePool = {
  request() {
    const inputs = {};
    return {
      input(nombre, _tipo, valor) {
        inputs[nombre] = valor;
        return this;
      },
      async query(query) {
        if (/SELECT 1 AS existe FROM dbo\.zk_Users/.test(query)) {
          return { recordset: usuarios.has(inputs.UserCode) ? [{ existe: 1 }] : [] };
        }
        if (/MERGE dbo\.zk_Users/.test(query)) {
          usuarios.set(inputs.UserCode, inputs.Name);
          return { rowsAffected: [1] };
        }
        if (/MERGE dbo\.zk_UserData64/.test(query)) {
          if (fallarHuella) throw new Error("BD caída");
          huellas.set(`${inputs.UserCode}|${inputs.DataIndex}`, inputs.BinaryData);
          return { recordset: [{ accion: "INSERT" }] };
        }
        if (/DELETE FROM dbo\.zk_Users/.test(query)) {
          usuarios.delete(inputs.UserCode);
          return { rowsAffected: [1] };
        }
        if (/SELECT DeviceSN FROM dbo\.zk_Devices/.test(query)) {
          return { recordset: DISPOSITIVOS.map((DeviceSN) => ({ DeviceSN })) };
        }
        if (/INSERT INTO dbo\.zk_QueueCMD/.test(query)) {
          for (const DeviceSN of DISPOSITIVOS) cola.push({ DeviceSN, CMD: inputs.CMD, orden: inputs.orden });
          assert.doesNotMatch(query, /Pin=/); // el comando nunca va concatenado en el SQL
          return { rowsAffected: [DISPOSITIVOS.length] };
        }
        return { rowsAffected: [0], recordset: [] };
      },
    };
  },
};
const rutaConexion = path.resolve(__dirname, "../database/connectionSQLserver.js");
require.cache[rutaConexion] = {
  id: rutaConexion,
  filename: rutaConexion,
  loaded: true,
  exports: { poolPromise: Promise.resolve(fakePool), sql: require("mssql") },
};

const { agregarPersona } = require("../controller/eventosAsistencia.controller");
const { validarPersona } = require("../services/personaHuelleroService");

const HUELLA = Buffer.from("plantilla-de-prueba-zk").toString("base64");

function crearRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

const silenciar = () => {
  const original = { log: console.log, error: console.error };
  console.log = console.error = () => {};
  return () => Object.assign(console, original);
};

beforeEach(() => {
  usuarios.clear();
  huellas.clear();
  cola.length = 0;
  fallarHuella = false;
});

test("agrega la persona, guarda su huella y la envía a los huelleros activos", async () => {
  const restaurar = silenciar();
  const res = crearRes();
  await agregarPersona({ body: { nombre: "  Juan Perez ", dni: "41235478", binaryData: HUELLA, dedo: 6 } }, res);
  restaurar();

  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body.huelleros, DISPOSITIVOS);
  assert.equal(usuarios.get(41235478), "Juan Perez");
  assert.deepEqual(huellas.get("41235478|6"), Buffer.from(HUELLA, "base64"));

  // 3 comandos por huellero, en orden: usuario -> huella -> autorización de acceso.
  // La huella necesita que el usuario ya exista en el equipo; si llega antes, se descarta.
  assert.equal(cola.length, 6);
  const delEquipo = cola.filter((c) => c.DeviceSN === "CRJP230860129");
  const [alta, huella, autorizacion] = delEquipo.map((c) => c.CMD);
  // Cada comando 1 s después del anterior (CreationTime se guarda al segundo)
  assert.deepEqual(delEquipo.map((c) => c.orden), [0, 1, 2]);
  assert.match(alta, /^C:\d+:DATA UPDATE user CardNo=\tPin=41235478\t.*\tName=Juan Perez\tPrivilege=0$/);
  // Sin autorización el equipo reconoce la huella pero dice "Periodo de tiempo no válido"
  assert.match(autorizacion, /^C:\d+:DATA UPDATE userauthorize Pin=41235478\tAuthorizeTimezoneId=1\tAuthorizeDoorId=1$/);
  assert.match(huella, new RegExp(`^C:\\d+:DATA UPDATE templatev10 Size=22\\tPin=41235478\\tFingerID=6\\tValid=1\\tTemplate=${HUELLA.replace(/[+/=]/g, "\\$&")}\\tEndTag=$`));
});

test("el dedo es 0 por defecto; el BinaryData acepta saltos de línea pegados", async () => {
  const restaurar = silenciar();
  const res = crearRes();
  const conSaltos = HUELLA.slice(0, 10) + "\n" + HUELLA.slice(10);
  await agregarPersona({ body: { nombre: "Ana", dni: 76069670, binaryData: conSaltos } }, res);
  restaurar();

  assert.equal(res.statusCode, 201);
  assert.ok(huellas.has("76069670|0"));
});

test("rechaza un DNI que ya existe sin tocar nada", async () => {
  usuarios.set(41235478, "Existente");
  const res = crearRes();
  await agregarPersona({ body: { nombre: "Otro", dni: "41235478", binaryData: HUELLA } }, res);

  assert.equal(res.statusCode, 409);
  assert.equal(usuarios.get(41235478), "Existente");
  assert.equal(cola.length, 0);
});

test("si falla la huella, deshace el alta y no envía nada a los huelleros", async () => {
  fallarHuella = true;
  const restaurar = silenciar();
  const res = crearRes();
  await agregarPersona({ body: { nombre: "Juan", dni: "41235478", binaryData: HUELLA } }, res);
  restaurar();

  assert.equal(res.statusCode, 500);
  assert.equal(usuarios.has(41235478), false);
  assert.equal(cola.length, 0);
});

test("valida nombre, DNI, BinaryData y dedo", () => {
  const base = { nombre: "Juan", dni: "41235478", binaryData: HUELLA };
  const casos = [
    [{ ...base, nombre: "" }, /nombre es obligatorio/],
    [{ ...base, nombre: "x".repeat(41) }, /40 caracteres/],
    [{ ...base, nombre: "Juan\tPin=1" }, /tabuladores/],
    [{ ...base, dni: "4123A478" }, /DNI/],
    [{ ...base, dni: "0" }, /DNI/],
    [{ ...base, binaryData: "" }, /BinaryData es obligatorio/],
    [{ ...base, binaryData: "no es base64!" }, /carácter no válido: "!" \(posición 11\)/],
    [{ ...base, binaryData: "abcde" }, /incompleto/],
    [{ ...base, dedo: 10 }, /dedo/],
  ];
  for (const [datos, esperado] of casos) {
    const { error } = validarPersona(datos);
    assert.match(error || "", esperado, JSON.stringify(datos));
  }
  assert.equal(validarPersona(base).error, undefined);
});

test("quita los ceros de relleno del búfer de 2048 bytes que entregan las apps del SDK", async () => {
  const { quitarRelleno } = require("../services/personaHuelleroService");
  const real = Buffer.from("M9SR22-plantilla-real");
  const conRelleno = Buffer.concat([real, Buffer.alloc(2048 - real.length)]);
  assert.equal(quitarRelleno(conRelleno.toString("base64")), real.toString("base64"));
  assert.equal(quitarRelleno(real.toString("base64")), real.toString("base64"));

  const restaurar = silenciar();
  const res = crearRes();
  await agregarPersona({ body: { nombre: "Relleno", dni: "337788", binaryData: conRelleno.toString("base64"), dedo: 6 } }, res);
  restaurar();

  assert.equal(res.statusCode, 201);
  assert.deepEqual(huellas.get("337788|6"), real);
  const comandoHuella = cola.find((c) => c.DeviceSN === "CRJP230860129" && /templatev10/.test(c.CMD)).CMD;
  assert.match(comandoHuella, new RegExp(`Size=${real.length}\t`));
  assert.ok(comandoHuella.includes(`Template=${real.toString("base64")}\t`));
});

test("rechaza un BinaryData que solo tiene ceros", () => {
  const { validarPersona } = require("../services/personaHuelleroService");
  const { error } = validarPersona({ nombre: "X", dni: "1", binaryData: Buffer.alloc(2048).toString("base64") });
  assert.match(error, /solo contiene ceros/);
});

test("normaliza el base64 tal como lo copian las apps", () => {
  const { normalizarBase64 } = require("../services/personaHuelleroService");
  const bytes = Buffer.from([0xfb, 0xff, 0xbf, 0x4d, 0x39, 0x53, 0x52, 0x32, 0x32, 0x10]);
  const estandar = bytes.toString("base64"); // contiene + y /, y termina en =
  assert.match(estandar, /[+/].*=$/);

  const variantes = [
    estandar,
    bytes.toString("base64url"), // - y _ sin "="
    estandar.replace(/=+$/, ""), // sin "=" final
    estandar.replace(/\//g, "\\/"), // barras escapadas de JSON
    `"${estandar}"`, // entre comillas
    `data:application/octet-stream;base64,${estandar}`,
    estandar.slice(0, 5) + "\\n" + estandar.slice(5), // "\n" escrito como texto
    estandar.slice(0, 5) + "\n  " + estandar.slice(5), // salto de línea real
    `${estandar}ç`, // carácter tecleado por error después del "=" final
    `${estandar}ç\n`,
  ];
  // Un carácter "A" de más dentro del relleno de ceros final se descarta
  const conRelleno = Buffer.concat([bytes, Buffer.alloc(32)]).toString("base64"); // 42 bytes: 56 caracteres
  assert.equal(conRelleno.length % 4, 0);
  assert.equal(normalizarBase64(`${conRelleno}A=ç`).base64, conRelleno);
  assert.match(normalizarBase64("QUJDRUZHB").error, /incompleto/); // sobra un carácter que no es relleno
  for (const v of variantes) {
    assert.equal(normalizarBase64(v).base64, estandar, v);
  }
});

test("la franja horaria y las puertas se pueden configurar por variables de entorno", () => {
  const { autorizacionPorDefecto } = require("../services/personaHuelleroService");
  const anterior = { f: process.env.ZK_ACC_FRANJA_HORARIA, p: process.env.ZK_ACC_PUERTAS };
  delete process.env.ZK_ACC_FRANJA_HORARIA;
  delete process.env.ZK_ACC_PUERTAS;
  assert.deepEqual(autorizacionPorDefecto(), { franjaHoraria: 1, puertas: 1 });
  process.env.ZK_ACC_FRANJA_HORARIA = "2";
  process.env.ZK_ACC_PUERTAS = "3";
  assert.deepEqual(autorizacionPorDefecto(), { franjaHoraria: 2, puertas: 3 });
  for (const [k, v] of [["ZK_ACC_FRANJA_HORARIA", anterior.f], ["ZK_ACC_PUERTAS", anterior.p]]) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});
