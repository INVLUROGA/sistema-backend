const { sql, poolPromise } = require("../database/connectionSQLserver");

/// Servicio modificado para procesar y acumular múltiples tramas FP
const checkOrInsertFP = async (data) => {
  try {
    // Obtener la conexión del pool
    const pool = await poolPromise;
    let status = false; // Variable para conocer si hay una huella nueva
    // Construir el query para la inserción
    const query = `
            INSERT INTO dbo.zk_UserData64 (UserCode, DataLabel, DataIndex, SizeData, BinaryData, HashData, CreationTime)
            VALUES (@UserCode, @DataLabel, @DataIndex, @SizeData, @BinaryData, HASHBYTES('SHA2_256', CONVERT(VARBINARY(MAX), @BinaryData)) ,FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz'))
        `;

    // Ejecutar la inserción para cada registro en "data"
    for (let i = 0; i < data.length; i++) {
      let record = data[i];

      try {
        await pool
          .request()
          .input("UserCode", sql.Int, record.PIN) // El valor de UserId viene del record
          .input("DataLabel", sql.NVarChar, record.Operator)
          .input("DataIndex", sql.Int, record.FID)
          .input("SizeData", sql.Int, record.Size)
          .input("BinaryData", sql.VarBinary, Buffer.from(record.TMP, "base64")) // Convertir TMP de base64 a varbinary
          .query(query);
        status = status || true;
      } catch (error) {
        status = status || false;
        // Manejar errores de inserción para cada registro
        if (error.number === 2601) {
          console.error(
            `Error al insertar la Huella Digital ${record.FID}: No se puede insertar filas duplicadas.`
          );
        } else {
          console.error(
            `Error inesperado al insertar el registro ${record.FID}: ${error.message}`
          );
        }
        // Puedes continuar con el siguiente registro sin hacer nada más aquí
      }
    }

    if (status) {
      console.log("Insercion de Huellas Digitales completadas.");
      return {
        success: status,
        message: "Insercion de Huellas Digitales completadas.",
      };
    } else {
      console.log("No existen nuevas huellas por agregar");
      return {
        success: status,
        message: "No existen nuevas huellas por agregar",
      };
    }
  } catch (error) {
    console.error("Error al conectar a la base de datos: ", error.message);
    throw new Error("Error al conectar a la base de datos.");
  }
};

const checkOrInsertFPAPI = async (data) => {
  try {
    // Obtener la conexión del pool
    const pool = await poolPromise;
    // Construir el query para la inserción
    const query = `
            INSERT INTO dbo.zk_UserData64 (UserCode, DataLabel, DataIndex, SizeData, BinaryData, HashData, CreationTime)
            VALUES (@UserCode, 'FP', @DataIndex, @SizeData, @BinaryData, HASHBYTES('SHA2_256', CONVERT(VARBINARY(MAX), @BinaryData)) , FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz'))
        `;

    // Ejecutar la inserción para cada registro en "data"
    await pool
      .request()
      .input("UserCode", sql.Int, data.UserCode) // El valor de UserId viene del record
      .input("DataIndex", sql.Int, data.DataIndex)
      .input("SizeData", sql.Int, data.SizeData)
      .input(
        "BinaryData",
        sql.VarBinary,
        Buffer.from(data.BinaryData, "base64")
      ) // Convertir TMP de base64 a varbinary
      .query(query);

    console.log("Insercion de Huellas Digitales completadas.");
    return {
      success: true,
      message: "Insercion de Huellas Digitales completadas.",
    };
  } catch (error) {
    // Manejar errores de inserción para cada registro
    if (error.number === 2601) {
      console.error(
        `Error al insertar la Huella Digital ${data.DataIndex}: Huella duplicada.`
      );
      return {
        success: false,
        message: `Error al insertar la Huella Digital ${data.DataIndex}: Huella duplicada.`,
      };
    } else {
      console.error(
        `Error inesperado al insertar el registro ${data.DataIndex}: ${error.message}`
      );
      return {
        success: false,
        message: `Error inesperado al insertar el registro ${data.DataIndex}: ${error.message}`,
      };
    }
  }
};

module.exports = {
  checkOrInsertFP,
  checkOrInsertFPAPI,
};
