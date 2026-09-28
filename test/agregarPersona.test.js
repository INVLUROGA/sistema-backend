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
          for (const DeviceSN of DISPOSITIVOS) cola.push({ DeviceSN, CMD: inputs.CMD });
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

  // 2 comandos (usuario + huella) por cada huellero activo
  assert.equal(cola.length, 4);
  const [alta, huella] = cola.filter((c) => c.DeviceSN === "CRJP230860129").map((c) => c.CMD);
  assert.match(alta, /^C:\d+:DATA UPDATE user CardNo=\tPin=41235478\t.*\tName=Juan Perez\tPrivilege=0$/);
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
    [{ ...base, binaryData: "no es base64!" }, /base64/],
    [{ ...base, binaryData: "abc" }, /base64/],
    [{ ...base, dedo: 10 }, /dedo/],
  ];
  for (const [datos, esperado] of casos) {
    const { error } = validarPersona(datos);
    assert.match(error || "", esperado, JSON.stringify(datos));
  }
  assert.equal(validarPersona(base).error, undefined);
});
