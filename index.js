const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const { urlArchivos, urlArchivoLogos } = require("./config/constant");
const { db } = require("./database/sequelizeConnection.js");
const { validarJWT } = require("./middlewares/validarJWT.js");
const cron = require("node-cron");
const {
  obtenerCumpleaniosCliente,
  alertasUsuario,
  recordatorioReservaCita24hAntes,
  recordatorioReservaCita2hAntes,
  obtenerCumpleaniosDeEmpleados,
} = require("./middlewares/eventosCron.js");
const {
  obtenerCumpleaniosDelMesSiguiente,
} = require("./middlewares/EventosCron/obtenerCumpleañosDelMesSiguiente.js");

// Programa una tarea para las 9 AM todos los días
// const cum = obtenerDataSeguimientos();
// console.log(cum);
cron.schedule("0 3 1 * *", async () => { });

cron.schedule("0 15 * * *", () => {
  // insertaDatosTEST();
  obtenerCumpleaniosCliente();
  obtenerCumpleaniosDeEmpleados();
});
cron.schedule("0 1 * * *", async () => {
  await insertarTC();
});
cron.schedule("55 * * * *", () => {
  recordatorioReservaCita24hAntes();
});

// Run alerts every minute to checking for specific times
cron.schedule("* * * * *", () => {
  alertasUsuario();
});
cron.schedule("30 8 * * *", () => {
  recordatorioReservaCita2hAntes();
});
cron.schedule("59 23 * * *", () => {
  recordatorioReservaCita2hAntes();
});
const fileServer = express.static;
require("dotenv").config();
const env = process.env;

//Creando el servidor de express
const app = express();
// app.use(compression());
// test();
//Base de datos
//dbConnection()
// getConnection();
const getConnectionORM = async () => {
  try {
    await db.authenticate();
    // await ImagePT.sync({ force: true });
    console.log("Conexion exitosa a la base de datos con ORM sequalize");
  } catch (error) {
    console.error("Error al conectar a la base de datos con sequelize:", error);
  }
};
getConnectionORM();
const allowedOrigins = [
  "https://change-the-slim-studio-sigma.vercel.app",
  "https://circus-henna.vercel.app",
  "https://circus-pi.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "https://arrendamiento-tau.vercel.app",
];
//CORS
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = "El origen CORS no está permitido.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  }),
);

app.use(morgan("dev")); // Usa "dev" o cualquier otro formato que prefieras
//Directorio publico
app.use(express.static("public"));
// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });

//Lectura y parseo del body
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(require("./routes/zk.router.js"));

//***********************************************/
//***********DISPOSITIVOS ZKTECO*****************/
//***********************************************/

// Importa y usa las rutas
const cdataRoutes = require("./routes/ZkTeco/iclock/cdataRoutes");
const devicecmdRoutes = require("./routes/ZkTeco/iclock/devicecmdRoutes");
const getrequestRoutes = require("./routes/ZkTeco/iclock/getrequestRoutes");
const pingRoutes = require("./routes/ZkTeco/iclock/pingRoutes");
const registryRoutes = require("./routes/ZkTeco/iclock/registryRoutes");

const cmdqueueRoutes = require("./routes/ZkTeco/bd/cmdqueueRoutes");
const transactionRoutes = require("./routes/ZkTeco/bd/transactionRoutes");
const deviceRoutes = require("./routes/ZkTeco/bd/deviceRoutes");
const userRoutes = require("./routes/ZkTeco/bd/userRoutes");
const syncRoutes = require("./routes/ZkTeco/bd/syncRoutes");
const userdata64Routes = require("./routes/ZkTeco/bd/userdata64Routes");
const path = require("path");
// enviarMensajes()
const clienteMFRouter = require("./routes/cliente_mf.router");
const { insertarTC } = require("./middlewares/EventosCron/insertarTC.js");
app.use("/api/cliente_mf", clienteMFRouter);
app.use(cdataRoutes);
app.use(devicecmdRoutes);
app.use(getrequestRoutes);
app.use(pingRoutes);
app.use(registryRoutes);

app.use(cmdqueueRoutes);
app.use(transactionRoutes);
app.use(deviceRoutes);
app.use(userRoutes);
app.use(syncRoutes);
app.use(userdata64Routes);

// Servir archivos estáticos desde /public
// app.use(
//   express.static(path.join(__dirname, "public"), {
//     setHeaders: (res, filePath) => {
//       // Forzar el Content-Type correcto si es mp4
//       if (path.extname(filePath).toLowerCase() === ".mp4") {
//         res.setHeader("Content-Type", mime.getType("mp4") || "video/mp4");
//         // (Opcional) cache largo
//         res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
//       }
//     },
//   })
// );
//BLOBS
app.use("/api/storage/blob", require("./routes/upload/blob.router.js"));

app.use("/api/tipocambio", require("./routes/tipocambio.route.js"));
app.use("/api/alerta-usuario", require("./routes/alertaUsuario.route.js"));

//RUTA FILES
app.use("/api/file", fileServer(urlArchivos));
app.use("/api/file/logo", fileServer(urlArchivoLogos));

app.use("/api/fils", require("./routes/file.router.js"));
//************************ */
//**************Rutas***** */
//************************ */
// app.use('/api/colaborador', require('./routes/colaborador.router.js'))
app.use("/api/seguimiento", require("./routes/seguimiento.router.js"));
app.use("/api/movimiento-articulo", require("./routes/kardex.router.js"));
app.use("/api/articulo", require("./routes/articulo.router.js"));
app.use("/api/cuenta-balance", require("./routes/cuentaBalance.router.js"));
// //TODO proveedores // sexo, tipoDoc, estadoCivil, etc

app.use("/api/proveedor", validarJWT, require("./routes/proveedor.router.js"));
app.use(
  "/api/contrato-prov",
  validarJWT,
  require("./routes/contratoProv.router.js"),
);
app.use("/api/producto", require("./routes/producto.route.js"));
//TODO: JUNTAR LOS DOS EN UNA RUTA
app.use("/api/egreso", validarJWT, require("./routes/gastos.router.js"));
//TODO: programas
app.use(
  "/api/programaTraining",

  require("./routes/programaTraining.route.js"),
);
//TODO: PARAMETROS TODO TIPO(SEXO, TIPO DOC, NACIONALIDAD, TIPOCLIENTE, REFERENCIA DE CONTACTO, ETC)
app.use("/api/parametros", require("./routes/parametros.route.js"));
app.use("/api/jornada", require("./routes/jornada.route.js"));
//TODO: USUARIOS(CLIENTES, COLABORADORES, USUARIOS LOGEADOS)
app.use("/api/usuario", require("./routes/usuario.route.js"));
app.use("/api/apireniec", require("./routes/api.reniec.route.js"));
app.use("/api/cambio-programa", require("./routes/cambioPrograma.route.js"));
app.use("/api/msg-masivos", require("./routes/msgMasivos.route.js"));
app.use("/api/wsp", require("./routes/wsp.route.js"));

app.use("/api/servicios", validarJWT, require("./routes/servicios.router.js"));
app.use("/api/generador-fechas", require("./routes/generadorFechas.router.js"));
app.use(
  "/api/extension-membresia",
  require("./routes/extension_mem.router.js"),
);

app.use("/api/meta", validarJWT, require("./routes/meta.route.js"));
app.use("/api/impuestos", validarJWT, require("./routes/impuestos.router.js"));
//TODO upload // imgs
app.use("/api", require("./routes/upload/upload.routes.js"));

app.use("/api/reporte", require("./routes/reporte.router.js"));
app.use("/api/comision", validarJWT, require("./routes/comision.router.js"));
app.use(
  "/api/inventario",
  validarJWT,
  require("./routes/inventario.router.js"),
);

app.use(
  "/api/marcacion" /*, validarJWT,*/,
  require("./routes/marcacion.router.js"),
);
//TODO: FORMA PAGO
app.use("/api/formaPago", validarJWT, require("./routes/formaPago.router.js"));
app.use("/api/rol", validarJWT, require("./routes/roles.router.js"));
app.use("/api/venta", require("./routes/venta.router.js"));
app.use("/api/lead", validarJWT, require("./routes/lead.router.js"));
app.use(
  "/api/reserva_monk_fit",
  require("./routes/reserva_monk_fit.router.js"),
);
// app.use("/api/pros")
app.use(
  "/api/serviciospt",
  validarJWT,
  require("./routes/serviciosPT.router.js"),
);
app.use(
  "/api/exportar",
  validarJWT,
  require("./routes/exportarData.router.js"),
);
app.use("/api/cita", validarJWT, require("./routes/cita.router.js"));
app.use("/api/prospecto", validarJWT, require("./routes/prospecto.router.js"));
app.use("/api/auditoria", validarJWT, require("./routes/auditoria.router.js"));
app.use("/api/ingreso", validarJWT, require("./routes/ingresos.router.js"));
app.use("/api/dieta", require("./routes/dieta.router.js"));

app.use(
  "/api/flujo-caja",
  validarJWT,
  require("./routes/flujo-caja.router.js"),
);
app.use("/api/recursosHumanos", require("./routes/recursosHumanos.route.js"));
app.use("/api/terminologia", require("./routes/terminologia.router.js"));

//CIRCUS----
app.use("/api/circus", require("./routes/routersCircus/servicios.router.js"));
app.use("/api/canjes", require("./routes/canjes.router.js"));
app.use("/api/penalidad", require("./routes/penalidad.router.js"));
//Escuchar peticiones
app.listen(env.PORT || 3001, env.IP, () => {
  console.log(`Servidor corriendo en el puerto ${env.IP}${env.PORT || 3001}`);
});
