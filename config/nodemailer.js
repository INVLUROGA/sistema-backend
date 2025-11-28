const nodemailer = require("nodemailer");
require("dotenv").config();
const env = process.env;

const transporterU = nodemailer.createTransport({
  host: "mail.change.com.pe",
  port: 587,
  secure: false,
  auth: {
    user: env.EMAIL_CONTRATOS,
    pass: env.PSW_CONTRATOS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Verifica la conexión SMTP
transporterU.verify((error, success) => {
  if (error) {
    console.log("Error en la conexión SMTP:", error);
  } else {
    console.log("Listo para enviar mensajes");
  }
});
// const transporterU = () => {
//   return "hola";
// };

module.exports = transporterU;
