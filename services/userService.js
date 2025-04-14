const { sql, poolPromise } = require("../database/connectionSQLserver");

// Función para segmentar una transacción
const segmentarTramaUser = (trama) => {
  const matches = [];
  const regex = /(\w+)=([^\s]*)/g;

  let match;

  // Dividir el cuerpo en líneas
  const lines = trama.split("\n");

  lines.forEach((line) => {
    if (line.trim() !== "") {
      let currentFP = {}; // Objeto temporal para cada trama FP

      // Extraer la primera palabra
      const Operator = line.split(" ")[0]; // Extrae la primera palabra, en este caso 'USER'
      currentFP["Operator"] = Operator;

      // Iterar sobre cada línea y usar el regex para extraer las claves y valores
      while ((match = regex.exec(line)) !== null) {
        const key = match[1];
        const value = match[2];
        // Almacenar los pares clave/valor en currentFP
        currentFP[key] = value;
      }

      // Si la línea contenía una trama, asegúrate de agregarla al final
      matches.push(currentFP);
    }
  });

  return matches;
};

// Servicio para eliminar un usuario por su código de usuario
const deleteUser = async (UserCode) => {
  try {
    const pool = await poolPromise;
    const query = `DELETE FROM dbo.zk_Users WHERE UserCode = @UserCode`;

    await pool.request().input("UserCode", sql.Int, UserCode).query(query);

    return { success: true, message: "Usuario eliminado exitosamente." };
  } catch (error) {
    console.error("Error al eliminar el usuario:", error);
    throw new Error("Error al eliminar el usuario.");
  }
};

// Función para verificar si el usuario existe en la base de datos
const checkUserExists = async (UserCode) => {
  try {
    const pool = await poolPromise;
    const query = `SELECT COUNT(*) AS count FROM dbo.zk_Users WHERE UserCode = @UserCode`;

    const result = await pool
      .request()
      .input("UserCode", sql.Int, UserCode)
      .query(query);

    return result.recordset[0].count > 0; // Devuelve true si el usuario existe, false en caso contrario
  } catch (error) {
    console.error("Error al verificar si el usuario existe:", error);
    throw new Error("Error al verificar si el usuario existe.");
  }
};

// Función para crear un usuario
const createUser = async (userData) => {
  try {
    const pool = await poolPromise;
    const query = `
            INSERT INTO dbo.zk_Users (UserCode, Name, Password, Card, CreationTime, UpdateTime, IsActive, Role)
            VALUES (@UserCode, @Name, @Password, @Card, FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz'), FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz'), @IsActive, @Role)
        `;

    await pool
      .request()
      .input("UserCode", sql.Int, userData.UserCode)
      .input("Name", sql.NChar(40), userData.Name)
      .input("Password", sql.Int, userData.Password)
      .input("Card", sql.VarChar(20), userData.Card)
      .input("IsActive", sql.Bit, userData.IsActive)
      .input("Role", sql.Int, userData.Role)
      .query(query);

    return { success: true, message: "Usuario creado exitosamente." };
  } catch (error) {
    console.error("Error al crear el usuario:", error);
    throw new Error("Error al crear el usuario.");
  }
};

// Función para obtener los datos actuales del usuario
const getUserByCode = async (UserCode) => {
  try {
    const pool = await poolPromise;
    const query = `SELECT UserCode, Name, Password, Card, IsActive, Role FROM dbo.zk_Users WHERE UserCode = @UserCode`;

    const result = await pool
      .request()
      .input("UserCode", sql.Int, UserCode)
      .query(query);

    return result.recordset[0]; // Devuelve los datos actuales del usuario
  } catch (error) {
    console.error("Error al obtener el usuario:", error);
    throw new Error("Error al obtener el usuario.");
  }
};

// Función para actualizar un usuario si hay cambios
const updateUserIfChange = async (userData) => {
  try {
    const pool = await poolPromise;
    // Obtener los datos actuales del usuario
    const currentUser = await getUserByCode(userData.UserCode);

    // Comprobar si los campos han cambiado
    const fieldsToUpdate = {};

    if ((currentUser.Name || "").trim() !== (userData.Name || "").trim()) {
      fieldsToUpdate.Name = (userData.Name || "").trim();
    }
    if (Number(currentUser.Password) !== Number(userData.Password)) {
      fieldsToUpdate.Password = Number(userData.Password);
    }
    if ((currentUser.Card || "").trim() !== (userData.Card || "").trim()) {
      fieldsToUpdate.Card = (userData.Card || "").trim();
    }
    if (Boolean(currentUser.IsActive) !== Boolean(userData.IsActive)) {
      fieldsToUpdate.IsActive = Boolean(userData.IsActive);
    }
    if (Number(currentUser.Role) !== Number(userData.Role)) {
      fieldsToUpdate.Role = Number(userData.Role);
    }

    // Si no hay cambios, no actualiza
    if (Object.keys(fieldsToUpdate).length === 0) {
      return { success: false, message: "No hay cambios para actualizar." };
    }

    // Si hay cambios, construir la consulta dinámica para actualizar solo los campos modificados
    let updateQuery = "UPDATE dbo.zk_Users SET ";
    const updateFields = [];
    const params = [];

    for (const [field, value] of Object.entries(fieldsToUpdate)) {
      updateFields.push(`${field} = @${field}`);
      params.push({ name: field, value });
    }

    updateQuery += updateFields.join(", ");
    updateQuery +=
      ", UpdateTime = FORMAT(SYSDATETIMEOFFSET(), 'yyyy-MM-dd HH:mm:ss zzz')";
    updateQuery += " WHERE UserCode = @UserCode";

    const request = pool
      .request()
      .input("UserCode", sql.Int, userData.UserCode);

    params.forEach((param) => {
      request.input(param.name, param.value);
    });

    // Ejecutar la consulta de actualización
    await request.query(updateQuery);

    return { success: true, message: "Usuario actualizado con éxito." };
  } catch (error) {
    console.error("Error al actualizar el usuario:", error);
    throw new Error("Error al actualizar el usuario.");
  }
};

const createOrUpdateUser = async (userData) => {
  try {
    // Verificar si el usuario existe en la base de datos
    const userExists = await checkUserExists(userData.UserCode);

    if (userExists) {
      // Si el usuario existe, actualizar solo si hay cambios
      const result = await updateUserIfChange(userData);
      return { success: true, message: "Usuario actualizado." };
    } else {
      // Si el usuario no existe, crear un nuevo usuario
      const result = await createUser(userData);
      return result;
    }
  } catch (error) {
    console.error(
      "Error en la operación de creación o actualización de usuario:",
      error
    );
    return {
      success: false,
      message: "Error en la operación de creación o actualización de usuario.",
    };
  }
};

const checkOrCreateUser = async (userData) => {
  try {
    // Verificar si el usuario existe en la base de datos
    const userExists = await checkUserExists(userData.user_code);

    if (userExists) {
      // Si el usuario existe, no realizar nada
      return { success: false, message: "Usuario ya existe." };
    } else {
      // Si el usuario no existe, crear un nuevo usuario
      const result = await createBaseUser(userData);
      return result;
    }
  } catch (error) {
    console.error(
      "Error en la operación de creación o actualización de usuario:",
      error
    );
    return {
      success: false,
      message: "Error en la operación de creación o actualización de usuario.",
    };
  }
};

module.exports = {
  segmentarTramaUser,
  deleteUser,
  createOrUpdateUser,
  checkOrCreateUser,
};
