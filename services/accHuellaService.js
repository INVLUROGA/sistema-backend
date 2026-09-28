// services/accHuellaService.js
// Huellas de los equipos de CONTROL DE ACCESO (PUSH acc).
// El servidor pide las huellas con "DATA QUERY tablename=templatev10" y el equipo
// las envía a POST /iclock/querydata (o a /iclock/cdata?table=tabledata al enrolar).
// Probado con SpeedFace-V3L: al pedir "templatev10" responde las huellas en formato
// "biodata" (type=1); al pedir "biodata" solo responde el rostro (type=9).
// Se aceptan ambos formatos. Se guardan en dbo.zk_UserData64 con DataLabel='FP'.
const { sql, poolPromise } = require("../database/connectionSQLserver");
const commandService = require("./commandService");

const TABLA_HUELLAS = "templatev10"; // tabla que se pide al equipo
const TABLAS_HUELLAS = ["biodata", "templatev10"];
const TIPO_HUELLA = "1"; // biodata type=1: huella (los demás tipos son rostro, palma, etc.)

// Tramas aceptadas:
// "biodata pin=41235478	no=6	index=0	valid=1	duress=0	type=1	majorver=10	minorver=0	format=ZK	tmp=Sr9TUzIx..."
// "templatev10 size=1336	uid=1	pin=41235478	fingerid=6	valid=1	template=Sr9TUzIx...	resverse=	endtag="
function segmentarTramaHuellas(trama) {
  return String(trama)
    .split("\n")
    .map((linea) => linea.trim())
    .map((linea) => {
      const tabla = linea.split(/\s/)[0].toLowerCase();
      if (!TABLAS_HUELLAS.includes(tabla)) return null;
      const campos = {};
      for (const par of linea.slice(tabla.length).trim().split("\t")) {
        const i = par.indexOf("=");
        if (i > 0) campos[par.slice(0, i).trim().toLowerCase()] = par.slice(i + 1).trim();
      }
      if (tabla === "biodata" && campos.type !== TIPO_HUELLA) return null;
      const Template = (tabla === "biodata" ? campos.tmp : campos.template) || "";
      return {
        UserCode: parseInt(campos.pin, 10),
        DataIndex: parseInt(tabla === "biodata" ? campos.no : campos.fingerid, 10),
        SizeData: parseInt(campos.size, 10) || Buffer.from(Template, "base64").length,
        Template,
      };
    })
    .filter(Boolean)
    .filter(
      (h) =>
        Number.isInteger(h.UserCode) && h.UserCode > 0 &&
        Number.isInteger(h.DataIndex) && h.DataIndex >= 0 &&
        h.Template !== ""
    );
}

// Cantidad de registros recibidos en la trama (el equipo espera esta confirmación)
function contarRegistros(trama) {
  return String(trama).split("\n").filter((linea) => linea.trim() !== "").length;
}

/// Inserta las huellas nuevas y actualiza las que cambiaron (por PIN + dedo).
/// Retorna { nuevas, actualizadas, sinCambios }.
async function guardarHuellas(huellas) {
  const pool = await poolPromise;
  const query = `
        DECLARE @Hash VARBINARY(32) = HASHBYTES('SHA2_256', @BinaryData);
        MERGE dbo.zk_UserData64 AS destino
        USING (SELECT @UserCode AS UserCode, @DataIndex AS DataIndex) AS origen
        ON destino.UserCode = origen.UserCode AND destino.DataLabel = 'FP' AND destino.DataIndex = origen.DataIndex
        WHEN MATCHED AND ISNULL(destino.HashData, 0x) <> @Hash THEN
            UPDATE SET SizeData = @SizeData, BinaryData = @BinaryData, HashData = @Hash,
                       CreationTime = FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz')
        WHEN NOT MATCHED THEN
            INSERT (UserCode, DataLabel, DataIndex, SizeData, BinaryData, HashData, CreationTime)
            VALUES (@UserCode, 'FP', @DataIndex, @SizeData, @BinaryData, @Hash, FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz'))
        OUTPUT $action AS accion;
    `;

  const resumen = { nuevas: 0, actualizadas: 0, sinCambios: 0 };
  for (const huella of huellas) {
    try {
      const result = await pool
        .request()
        .input("UserCode", sql.Int, huella.UserCode)
        .input("DataIndex", sql.Int, huella.DataIndex)
        .input("SizeData", sql.Int, huella.SizeData)
        .input("BinaryData", sql.VarBinary(sql.MAX), Buffer.from(huella.Template, "base64"))
        .query(query);
      const accion = result.recordset?.[0]?.accion;
      if (accion === "INSERT") resumen.nuevas++;
      else if (accion === "UPDATE") resumen.actualizadas++;
      else resumen.sinCambios++;
    } catch (error) {
      // 547: la huella exige que el usuario exista en dbo.zk_Users (FOREIGN KEY)
      const detalle =
        error.number === 547
          ? "el usuario no está en zk_Users (ejecuta npm run usuarios-huellero)"
          : error.message;
      console.error(
        `Error al guardar la huella ${huella.DataIndex} del usuario ${huella.UserCode}: ${detalle}`
      );
    }
  }
  return resumen;
}

/// Encola el comando para que el equipo envíe todas sus huellas.
async function solicitarHuellas(DeviceSN, ahora = Date.now()) {
  const id = Math.floor(ahora / 1000) % 1000000000;
  await commandService.insertCommand(
    DeviceSN,
    `C:${id}:DATA QUERY tablename=${TABLA_HUELLAS},fielddesc=*,filter=*`
  );
  console.log(`[zk-huellas] Huellas solicitadas al equipo ${DeviceSN}`);
}

module.exports = {
  TABLA_HUELLAS,
  TABLAS_HUELLAS,
  segmentarTramaHuellas,
  contarRegistros,
  guardarHuellas,
  solicitarHuellas,
};
