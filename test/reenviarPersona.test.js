// Tests de POST /api/eventos-asistencia/personas/:pin/reenviar (sistema -> huellero)
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// BD falsa
let usuarios, huellas, dispositivos, cola;
const fakePool = {
  request() {
    const inputs = {};
    return {
      input(nombre, _tipo, valor) {
        inputs[nombre] = valor;
        return this;
      },
      async query(query) {
        if (/SELECT RTRIM\(Name\) AS Name, Card, Password, Role, IsActive FROM dbo\.zk_Users/.test(query)) {
          const u = usuarios.get(inputs.UserCode);
          return { recordset: u ? [u] : [] };
        }
        if (/FROM dbo\.zk_UserData64/.test(query)) {
          return { recordset: huellas.filter((h) => h.UserCode === inputs.UserCode) };
        }
        if (/SELECT DeviceSN FROM dbo\.zk_Devices/.test(query)) {
          return { recordset: dispositivos.map((DeviceSN) => ({ DeviceSN })) };
        }
        if (/INSERT INTO dbo\.zk_QueueCMD/.test(query)) {
          assert.doesNotMatch(query, /Pin=/); // el comando nunca va concatenado en el SQL
          for (const DeviceSN of dispositivos) cola.push({ DeviceSN, CMD: inputs.CMD, orden: inputs.orden });
          return { rowsAffected: [dispositivos.length] };
        }
        throw new Error(`Consulta inesperada: ${query}`);
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

const { reenviarPersona } = require("../controller/eventosAsistencia.controller");

async function llamar(pin) {
  const log = console.log;
  console.log = () => {};
  let status, body;
  await reenviarPersona({ params: { pin } }, { status: (s) => ((status = s), { json: (b) => (body = b) }) });
  console.log = log;
  return { status, body };
}

beforeEach(() => {
  usuarios = new Map([
    // Importado del huellero: tiene tarjeta, contraseña y es administrador (privilegio 14)
    [41235478, { Name: "Juan\tPerez", Card: "12345", Password: 4321, Role: 14 }],
    [76069670, { Name: "Ana", Card: null, Password: null, Role: 0 }],
  ]);
  huellas = [
    { UserCode: 41235478, DataIndex: 3, BinaryData: Buffer.from("huella-3") },
    // Con relleno de ceros (como las de la app del SDK): se envía sin el relleno
    { UserCode: 41235478, DataIndex: 6, BinaryData: Buffer.concat([Buffer.from("huella-6"), Buffer.alloc(10)]) },
  ];
  dispositivos = ["CRJP230860129", "CRJP230860136"];
  cola = [];
});

test("reenvía usuario -> huellas -> acceso 24 h a todos los huelleros activos, en orden", async () => {
  const { status, body } = await llamar("41235478");

  assert.equal(status, 200);
  assert.deepEqual(body.huelleros, dispositivos);
  assert.equal(body.huellas, 2);

  const delEquipo = cola.filter((c) => c.DeviceSN === "CRJP230860129");
  assert.deepEqual(delEquipo.map((c) => c.orden), [0, 1, 2, 3]);
  const [usuario, huella3, huella6, acceso] = delEquipo.map((c) => c.CMD);

  // Conserva tarjeta, contraseña y privilegio; el tabulador del nombre no rompe el comando
  assert.match(usuario, /^C:\d+:DATA UPDATE user CardNo=12345\tPin=41235478\tPassword=4321\t.*\tName=Juan Perez\tPrivilege=14$/);
  assert.match(huella3, new RegExp(`FingerID=3\\tValid=1\\tTemplate=${Buffer.from("huella-3").toString("base64")}\\t`));
  assert.match(huella6, new RegExp(`Size=8\\tPin=41235478\\tFingerID=6\\tValid=1\\tTemplate=${Buffer.from("huella-6").toString("base64")}\\t`));
  assert.match(acceso, /^C:\d+:DATA UPDATE userauthorize Pin=41235478\tAuthorizeTimezoneId=1\tAuthorizeDoorId=1$/);

  // Cada comando con su propio ID
  const ids = delEquipo.map((c) => c.CMD.split(":")[1]);
  assert.equal(new Set(ids).size, ids.length);
});

test("persona sin huellas: envía el usuario y el acceso", async () => {
  const { status, body } = await llamar("76069670");

  assert.equal(status, 200);
  assert.equal(body.huellas, 0);
  const cmds = cola.filter((c) => c.DeviceSN === "CRJP230860129").map((c) => c.CMD);
  assert.equal(cmds.length, 2);
  assert.match(cmds[0], /DATA UPDATE user CardNo=\tPin=76069670\tPassword=\t.*Privilege=0$/);
  assert.match(cmds[1], /DATA UPDATE userauthorize Pin=76069670/);
});

test("persona inexistente, DNI inválido o sin huelleros activos: no envía nada", async () => {
  assert.equal((await llamar("999")).status, 404);
  assert.equal((await llamar("abc")).status, 400);
  dispositivos = [];
  assert.equal((await llamar("41235478")).status, 409);
  assert.equal(cola.length, 0);
});

test("persona inactiva: se reenvía sin acceso (se borra su autorización, no puede entrar)", async () => {
  usuarios.set(55555555, { Name: "Vencido", Card: null, Password: null, Role: 0, IsActive: false });
  huellas.push({ UserCode: 55555555, DataIndex: 1, BinaryData: Buffer.from("h") });
  const { status } = await llamar("55555555");

  assert.equal(status, 200);
  const cmds = cola.filter((c) => c.DeviceSN === "CRJP230860129").map((c) => c.CMD);
  assert.match(cmds[0], /DATA UPDATE user /);
  assert.match(cmds[1], /DATA UPDATE templatev10 /);
  assert.match(cmds[2], /^C:\d+:DATA DELETE userauthorize Pin=55555555$/);
  assert.equal(cmds.some((c) => /DATA UPDATE userauthorize/.test(c)), false);
});
