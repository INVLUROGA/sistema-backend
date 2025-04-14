const { sql, poolPromise } = require("../database/connectionSQLserver");

// Servicio para obtener la información del usuario y sus datos asociados en UserData64
async function getUserInfoAndData(UserCode) {
  try {
    const pool = await poolPromise;
    const userQuery = `
            SELECT 
                UserCode, 
                RTRIM(Name) AS Name,
                Password, 
                Card, 
                IsActive, 
                Role
            FROM dbo.zk_Users
            WHERE UserCode = @UserCode
        `;
    // Consultar los datos del usuario
    const userResult = await pool
      .request()
      .input("UserCode", sql.Int, UserCode)
      .query(userQuery);

    // Verificar si el usuario existe
    if (userResult.recordset.length === 0) {
      return {
        sucess: false,
        error: "Usuario no encontrado",
      };
    }

    const dataQuery = `
            SELECT 
                DataLabel,
                DataIndex,
                SizeData,
                CAST(BinaryData AS VARCHAR(MAX)) AS BinaryDataBase64
            FROM dbo.zk_UserData64
            WHERE UserCode = @UserCode
        `;

    // Consultar los datos de UserData64
    const dataResult = await pool
      .request()
      .input("UserCode", sql.Int, UserCode)
      .query(dataQuery);

    // Procesar BinaryData a base64 para todas las filas
    dataResult.recordset.forEach((row) => {
      if (row.BinaryDataBase64) {
        row.BinaryDataBase64 = Buffer.from(
          row.BinaryDataBase64,
          "binary"
        ).toString("base64");
      }
    });

    // Devolver la información separada en dos partes
    return {
      sucess: true,
      user: userResult.recordset[0], // Información del usuario
      data: dataResult.recordset, // Lista de datos en base64
    };
  } catch (error) {
    console.error("Error al obtener la información del usuario:", error);
    throw error;
  }
}

module.exports = {
  getUserInfoAndData,
};
