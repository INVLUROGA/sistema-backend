// Tests de la descarga de huellas de equipos de control de acceso (PUSH acc)
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// BD falsa: simula el MERGE por (UserCode, DataIndex) comparando el contenido
const huellasBD = new Map();
const comandos = [];
const fakePool = {
  request() {
    const inputs = {};
    return {
      input(nombre, _tipo, valor) {
        inputs[nombre] = valor;
        return this;
      },
      async query(query) {
        if (/MERGE dbo\.zk_UserData64/.test(query)) {
          if (inputs.UserCode === 111) {
            const error = new Error("FOREIGN KEY");
            error.number = 547;
            throw error;
          }
          const clave = `${inputs.UserCode}|${inputs.DataIndex}`;
          const anterior = huellasBD.get(clave);
          huellasBD.set(clave, inputs.BinaryData);
          if (!anterior) return { recordset: [{ accion: "INSERT" }] };
          if (!anterior.equals(inputs.BinaryData)) return { recordset: [{ accion: "UPDATE" }] };
          return { recordset: [] };
        }
        if (/INSERT INTO dbo\.zk_QueueCMD/.test(query)) comandos.push({ ...inputs });
        return { rowsAffected: [1], recordset: [] };
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

const accHuellaService = require("../services/accHuellaService");
const querydataController = require("../controller/ZkTeco/iclock/querydataController");
const cdataController = require("../controller/ZkTeco/iclock/cdataController");

const TRAMA =
  "templatev10 size=4\tuid=1\tpin=41235478\tfingerid=6\tvalid=1\ttemplate=AAEC\tresverse=\tendtag=\n" +
  "templatev10 size=4\tuid=1\tpin=41235478\tfingerid=7\tvalid=1\ttemplate=AAED\tresverse=\tendtag=\n" +
  "templatev10 size=0\tuid=2\tpin=76069670\tfingerid=1\tvalid=1\ttemplate=\tresverse=\tendtag=\n";

function crearRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    type() {
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
  };
}

const silenciar = () => {
  const original = { log: console.log, error: console.error };
  const errores = [];
  console.log = () => {};
  console.error = (...args) => errores.push(args.join(" "));
  return { errores, restaurar: () => Object.assign(console, original) };
};

beforeEach(() => {
  huellasBD.clear();
  comandos.length = 0;
});

test("segmentarTramaHuellas extrae PIN, dedo y plantilla, e ignora las vacías", () => {
  const huellas = accHuellaService.segmentarTramaHuellas(TRAMA);
  assert.equal(huellas.length, 2);
  assert.deepEqual(huellas[0], { UserCode: 41235478, DataIndex: 6, SizeData: 4, Template: "AAEC" });
});

test("POST /iclock/querydata tablename=templatev10 guarda las huellas y responde la cantidad", async () => {
  const s = silenciar();
  const res = crearRes();
  await querydataController.fxpost(
    { query: { SN: "CRJP230860129", tablename: "templatev10" }, body: TRAMA },
    res
  );
  s.restaurar();

  // Confirma las 3 líneas recibidas aunque solo 2 sean huellas válidas
  assert.equal(res.body, "templatev10=3");
  assert.equal(huellasBD.size, 2);
  assert.deepEqual(huellasBD.get("41235478|6"), Buffer.from("AAEC", "base64"));
});

test("no duplica huellas: repetidas sin cambios, actualiza solo las modificadas", async () => {
  const s = silenciar();
  const huellas = accHuellaService.segmentarTramaHuellas(TRAMA);
  const primera = await accHuellaService.guardarHuellas(huellas);
  const repetida = await accHuellaService.guardarHuellas(huellas);
  const cambiada = await accHuellaService.guardarHuellas([{ ...huellas[0], Template: "AAEE" }]);
  s.restaurar();

  assert.deepEqual(primera, { nuevas: 2, actualizadas: 0, sinCambios: 0 });
  assert.deepEqual(repetida, { nuevas: 0, actualizadas: 0, sinCambios: 2 });
  assert.deepEqual(cambiada, { nuevas: 0, actualizadas: 1, sinCambios: 0 });
});

test("huella de un usuario que no está en zk_Users avisa cómo resolverlo", async () => {
  const s = silenciar();
  await accHuellaService.guardarHuellas([{ UserCode: 111, DataIndex: 1, SizeData: 4, Template: "AAEC" }]);
  s.restaurar();

  assert.equal(s.errores.length, 1);
  assert.match(s.errores[0], /npm run usuarios-huellero/);
});

test("huella enrolada en el equipo (table=tabledata) se guarda automáticamente", async () => {
  const s = silenciar();
  const res = crearRes();
  await cdataController.fxpost(
    { query: { SN: "CRJP230860129", table: "tabledata", tablename: "templatev10" }, body: TRAMA, headers: {}, socket: {} },
    res
  );
  s.restaurar();

  assert.equal(res.body, "templatev10=3");
  assert.equal(huellasBD.size, 2);
});

test("solicitarHuellas encola DATA QUERY de templatev10", async () => {
  const s = silenciar();
  await accHuellaService.solicitarHuellas("CRJP230860129", 1_000_000_000_000);
  s.restaurar();

  assert.equal(comandos.length, 1);
  assert.equal(comandos[0].CMD, "C:0:DATA QUERY tablename=templatev10,fielddesc=*,filter=*");
});

// Trama real del SpeedFace-V3L (tabla unificada biodata); type=9 es rostro y se ignora
const TRAMA_BIODATA =
  "biodata pin=46568087\tno=3\tindex=0\tvalid=1\tduress=0\ttype=1\tmajorver=10\tminorver=0\tformat=ZK\ttmp=AAEC\n" +
  "biodata pin=46568087\tno=0\tindex=0\tvalid=1\tduress=0\ttype=9\tmajorver=35\tminorver=4\tformat=ZK\ttmp=AAED\n";

test("biodata: guarda solo huellas (type=1) usando no como número de dedo", async () => {
  const huellas = accHuellaService.segmentarTramaHuellas(TRAMA_BIODATA);
  assert.deepEqual(huellas, [{ UserCode: 46568087, DataIndex: 3, SizeData: 3, Template: "AAEC" }]);

  const s = silenciar();
  const res = crearRes();
  await querydataController.fxpost(
    { query: { SN: "CRJP230860129", tablename: "biodata", count: "2" }, body: TRAMA_BIODATA },
    res
  );
  s.restaurar();

  assert.equal(res.body, "biodata=2");
  assert.equal(huellasBD.size, 1);
  assert.ok(huellasBD.has("46568087|3"));
});
