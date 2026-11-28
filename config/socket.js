const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

/**
 * Inicializa socket.io sobre el servidor http de express.
 * Solo se conectan usuarios con un token JWT valido (el mismo x-token del API).
 */
const initSocket = (httpServer, allowedOrigins) => {
  io = new Server(httpServer, {
    cors: { origin: allowedOrigins },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No hay token en la conexion"));
    try {
      const { id_user, name } = jwt.verify(token, process.env.SECRET_KEY);
      socket.data.id_user = id_user;
      socket.data.name = name;
      next();
    } catch (error) {
      next(new Error("Token no valido"));
    }
  });

  return io;
};

const getIO = () => io;

/**
 * Avisa a todos los paneles de citas que una cita cambio.
 * accion: "agregar" | "editar" | "eliminar"
 * origen: socket.id de quien hizo el cambio (header x-socket-id), para que no recargue dos veces.
 */
const emitirCambioCita = (req, accion, cita) => {
  if (!io) return;
  try {
    io.emit("citas:cambio", {
      accion,
      id: cita?.id,
      origen: req.header("x-socket-id") || null,
      usuario: req.name || null,
    });
  } catch (error) {
    console.log("Error al emitir citas:cambio", error);
  }
};

module.exports = { initSocket, getIO, emitirCambioCita };
