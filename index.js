const express = require("express");
const morgan = require("morgan");
// const ZKLib = require("zklib-js");
const cors = require("cors");
const { urlArchivos, urlArchivoLogos } = require("./config/constant");
const { db } = require("./database/sequelizeConnection.js");
const transporterU = require("./config/nodemailer.js");
const { validarJWT } = require("./middlewares/validarJWT.js");
const cron = require("node-cron");
const {
  EnviarMensajeDeRecordatorioMembresia,
} = require("./middlewares/tareasCron.js");
const {
  insertaDatosTEST,
  insertarDatosSeguimientoDeClientes,
  obtenerCumpleaniosCliente,
  obtenerDataSeguimiento,
} = require("./middlewares/eventosCron.js");
// Programa una tarea para las 9 AM todos los días

cron.schedule("0 15 * * *", () => {
  // insertaDatosTEST();
  obtenerCumpleaniosCliente();
});
cron.schedule("0 * * * *", () => {
  // insertaDatosTEST();
  // obtenerCumpleaniosCliente();
});
const testtt = async () => {};
// insertarDatosSeguimientoDeClientes("true");
// EnviarMensajeDeRecordatorioMembresia();
// const { test } = require("./config/zkteco.js");
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

const sendReminderEmail = (email) => {
  const mailOptions = {
    from: "notificaciones@personaltraining.com.pe",
    to: `${email}`,
    subject: "Asunto del correo",
    html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${EMAIL_INFO.nombre_cli}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
            }
    
            table {
                width: 100%;
                border-collapse: collapse;
            }
    
    
            th {
                background-color: #f2f2f2;
            }
    
            .logo {
                width: 400px;
                margin: 0 auto;
                display: block;
            }
    
            .text-center {
                text-align: center;
            }
    
            .bold {
                font-weight: bold;
            }
            .bg-primary{
                background-color: #FF5000;
            }
            .bg-black{
                background-color: #000;
            }
            .m-0{
                margin: 0;
            }
            .color-white{
                color: #fff;
            }
            .body-table{
                display: flex;
                justify-content: center;
            }
            .dflex-jcenter{
                display: flex;
                justify-content: center;
            }
            .table-info tr{
                display: flex;
                justify-content: center;
            }
            .table-info td{
                width: 100%;
            }
            .table-info .param{
                text-align: right;
            }
            .table-info tr{
                margin-bottom: 5px;
            }
            .table-info{
                font-size: 18px;
            }
            
        </style>
    </head>
    
    <body>
            Este mensaje a sido enviando 10 dias antes de tu membresia
    </body>
    
    </html>
      `,
  };
  transporterU.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error(error);
    } else {
      console.log("Correo electrónico enviado: " + info.response);
    }

    // Cerrar la conexión SMTP
    transporterU.close();
  });
};

const allowedOrigins = [
  "https://change-the-slim-studio-sigma.vercel.app",
  "https://sistema-circus.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
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
  })
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
app.use(express.json());

app.use("/api/storage/blob", require("./routes/upload/blob.router.js"));

app.use("/api/zk", require("./routes/ZkTeco/zk.router.js"));
app.use("/api/tipocambio", require("./routes/tipocambio.route.js"));

//RUTA FILES
app.use("/api/file", fileServer(urlArchivos));
app.use("/api/file/logo", fileServer(urlArchivoLogos));

app.use("/api/fils", require("./routes/file.router.js"));
//Rutas
app.use("/api/kardex", require("./routes/kardex.router.js"));
// //TODO proveedores // sexo, tipoDoc, estadoCivil, etc
app.use("/api/proveedor", validarJWT, require("./routes/proveedor.router.js"));
app.use("/api/producto", validarJWT, require("./routes/producto.route.js"));
//TODO: JUNTAR LOS DOS EN UNA RUTA
app.use("/api/egreso", validarJWT, require("./routes/gastos.router.js"));
//TODO: programas
app.use(
  "/api/programaTraining",
  validarJWT,
  require("./routes/programaTraining.route.js")
);
//TODO: PARAMETROS TODO TIPO(SEXO, TIPO DOC, NACIONALIDAD, TIPOCLIENTE, REFERENCIA DE CONTACTO, ETC)
app.use("/api/parametros", require("./routes/parametros.route.js"));
app.use("/api/jornada", require("./routes/jornada.route.js"));
//TODO: USUARIOS(CLIENTES, COLABORADORES, USUARIOS LOGEADOS)
app.use("/api/usuario", require("./routes/usuario.route.js"));
app.use("/api/cambio-programa", require("./routes/cambioPrograma.route.js"));

app.use("/api/servicios", validarJWT, require("./routes/servicios.router.js"));
app.use(
  "/api/generador-fechas",
  validarJWT,
  require("./routes/generadorFechas.router.js")
);
app.use(
  "/api/extension-membresia",
  require("./routes/extension_mem.router.js")
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
  require("./routes/inventario.router.js")
);

app.use(
  "/api/marcacion" /*, validarJWT,*/,
  require("./routes/marcacion.router.js")
);
//TODO: FORMA PAGO
app.use("/api/formaPago", validarJWT, require("./routes/formaPago.router.js"));
app.use("/api/rol", validarJWT, require("./routes/roles.router.js"));
app.use("/api/venta", require("./routes/venta.router.js"));
// app.use("/api/pros")
app.use(
  "/api/serviciospt",
  validarJWT,
  require("./routes/serviciosPT.router.js")
);
app.use(
  "/api/exportar",
  validarJWT,
  require("./routes/exportarData.router.js")
);
app.use("/api/cita", validarJWT, require("./routes/cita.router.js"));
app.use("/api/prospecto", validarJWT, require("./routes/prospecto.router.js"));
app.use("/api/auditoria", validarJWT, require("./routes/auditoria.router.js"));
app.use("/api/aporte", validarJWT, require("./routes/aportes.router.js"));
app.use("/api/dieta", require("./routes/dieta.router.js"));

app.use(
  "/api/flujo-caja",
  validarJWT,
  require("./routes/flujo-caja.router.js")
);
app.use("/api/recursosHumanos", require("./routes/recursosHumanos.route.js"));
app.use("/api/terminologia", require("./routes/terminologia.router.js"));

app.use("/api/parametroGasto", require("./routes/parametroGasto.router.js"));
//CIRCUS----
app.use("/api/circus", require("./routes/routersCircus/servicios.router.js"));
// app.use("/circus/")
// obtenerDataSeguimiento();
//Escuchar peticiones
app.listen(env.PORT || 4001, () => {
  console.log(`Servidor corriendo en el puerto ${env.PORT || 4001}`);
});
