const axios = require("axios");
const qs = require("qs");

const env = process.env;

const enviarMsgWsp = async (token, instance, numberWsp, bodyMsg) => {
  const data = qs.stringify({
    token: token,
    to: numberWsp,
    body: bodyMsg,
  });

  const config = {
    method: "post",
    url: `https://api.ultramsg.com/${instance}/messages/chat`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: data,
  };

  try {
    const response = await axios(config);
    console.log(JSON.stringify(response.data), numberWsp);
    return { ok: true };
  } catch (error) {
    console.error(error.message || error, numberWsp);
    return { ok: false, msg: error.message || "Error desconocido" };
  }
};

const enviarMapaWsp = async (token, instance, numberWsp, address, lat, lng) => {
  const data = qs.stringify({
    token: token,
    to: numberWsp,
    address: address,
    lat: lat,
    lng: lng,
  });

  const config = {
    method: "post",
    url: `https://api.ultramsg.com/${instance}/messages/location`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: data,
  };

  try {
    const response = await axios(config);
    console.log(JSON.stringify(response.data), numberWsp);
    return { ok: true };
  } catch (error) {
    console.error(error.message || error, numberWsp);
    return { ok: false, msg: error.message || "Error desconocido" };
  }
};

const enviarMapaWsp__CIRCUS = (to, address, lat, lng) =>
  enviarMapaWsp(
    process.env.TOKEN_CIRCUS,
    process.env.INSTANCE_ID__CIRCUS,
    to,
    address,
    lat,
    lng
  );
const enviarMensajesWsp__CIRCUS = (to, body) =>
  enviarMsgWsp(
    process.env.TOKEN_CIRCUS,
    process.env.INSTANCE_ID__CIRCUS,
    to,
    body
  );

const enviarMensajesWsp__CHANGE = (to, body) =>
  enviarMsgWsp(
    process.env.TOKEN_CHANGE,
    process.env.INSTANCE_ID__CHANGE,
    to,
    body
  );

const enviarMensajesWsp = async (numberWsp, bodyMsg) => {
  const data = qs.stringify({
    token: "xy1mryu3skys910j",
    to: numberWsp,
    body: bodyMsg,
  });

  const config = {
    method: "post",
    url: "https://api.ultramsg.com/instance102151/messages/chat",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: data,
  };

  try {
    const response = await axios(config);
    console.log(JSON.stringify(response.data), numberWsp);
    return { ok: true };
  } catch (error) {
    console.error(error.message || error, numberWsp);
    return { ok: false, msg: error.message || "Error desconocido" };
  }
};

const enviarStickerWsp = (numberWsp, sticker) => {
  var data = qs.stringify({
    token: "xy1mryu3skys910j",
    to: numberWsp,
    sticker: sticker,
  });

  var config = {
    method: "post",
    url: "https://api.ultramsg.com/instance102151/messages/sticker",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: data,
  };

  axios(config).then(function (response) {
    console.log(JSON.stringify(response.data), numberWsp);
  });
};

const enviarImagenWsp = async (numberWsp, image) => {
  const data = qs.stringify({
    token: "xy1mryu3skys910j",
    to: numberWsp,
    image: image,
  });

  const config = {
    method: "post",
    url: "https://api.ultramsg.com/instance102151/messages/image",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: data,
  };

  try {
    const response = await axios(config);
    console.log(JSON.stringify(response.data), numberWsp);
    return { ok: true };
  } catch (error) {
    console.error(error.message || error, numberWsp);
    return { ok: false, msg: error.message || "Error desconocido" };
  }
};

const enviarDocumentoxWsp = async (numberWsp, httpDoc) => {
  const data = qs.stringify({
    token: "xy1mryu3skys910j",
    to: numberWsp,
    filename: "contrato.pdf",
    document: httpDoc,
  });

  const config = {
    method: "post",
    url: "https://api.ultramsg.com/instance102151/messages/document",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: data,
  };

  try {
    const response = await axios(config);
    console.log(JSON.stringify(response.data), numberWsp);
    return { ok: true };
  } catch (error) {
    console.error(error.message || error, numberWsp);
    return { ok: false, msg: error.message || "Error desconocido" };
  }
};

const enviarTextConImagenWsp = async (numberWsp, image, bodyMsg) => {
  const data = qs.stringify({
    token: "xy1mryu3skys910j",
    to: numberWsp,
    image: image,
    caption: bodyMsg,
  });

  const config = {
    method: "post",
    url: "https://api.ultramsg.com/instance102151/messages/image", // <-- CORRECTO
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: data,
  };

  // const config = {
  //   method: "post",
  //   url: "https://api.ultramsg.com/instance102151/messages/video",
  //   headers: {
  //     "Content-Type": "application/x-www-form-urlencoded",
  //   },
  //   data: data,
  // };

  try {
    const response = await axios(config);
    console.log(JSON.stringify(response.data), numberWsp);
    return { ok: true };
  } catch (error) {
    console.error(error.message || error, numberWsp);
    return { ok: false, msg: error.message || "Error desconocido" };
  }
};

const enviarBotonesWsp = async (numberWsp, bodyMsg, buttons) => {
  const data = qs.stringify({
    token: "xy1mryu3skys910j",
    to: numberWsp,
    body: bodyMsg,
    buttons: JSON.stringify(buttons)
  });

  const config = {
    method: "post",
    url: "https://api.ultramsg.com/instance102151/messages/chat",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    data: data
  };

  try {
    const response = await axios(config);
    console.log(JSON.stringify(response.data), numberWsp);
    return { ok: true };
  } catch (error) {
    console.error(error.message || error, numberWsp);
    return { ok: false, msg: error.message || "Error desconocido" };
  }
};

module.exports = {
  enviarMapaWsp__CIRCUS,
  enviarMensajesWsp,
  enviarStickerWsp,
  enviarImagenWsp,
  enviarTextConImagenWsp,
  enviarMensajesWsp__CIRCUS,
  enviarMensajesWsp__CHANGE,
  enviarDocumentoxWsp,
  enviarBotonesWsp,
};

// const qrcode = require("qrcode-terminal");
// const { Client, LocalAuth } = require("whatsapp-web.js");
// // Directorio donde se almacenará la sesión
// // Cargar variables de entorno

// const clientWSP = new Client({
//   authStrategy: new LocalAuth(),
//   // session: sessionData,
//   // webVersionCache: {
//   //   type: "remote",
//   //   remotePath:
//   //     "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
//   // },
// });

// clientWSP.on("qr", (qr) => {
//   // Generate and scan this code with your phone
//   qrcode.generate(qr, { small: true });
//   console.log(
//     "Escanea este código QR con tu WhatsApp para iniciar la sesión.",
//     qr
//   );
// });
// // Manejar la autenticación exitosa
// clientWSP.on("ready", () => {
//   console.log("Cliente autenticado y listo para usarse.");
// });

// // Manejar errores de autenticación
// clientWSP.on("auth_failure", (msg) => {
//   console.error("Error de autenticación", msg);
//   // fs.unlinkSync(SESSION_FILE_PATH); // Eliminar sesión inválida
// });
// //   client.on("message", (msg) => {
// //     if (msg.body == "") {
// //       msg.reply("pong");
// //     }
// //   });

// clientWSP.initialize();
// module.exports = {
//   clientWSP,
// };

// /*
// // Escucha mensajes entrantes
//   client.on("message", (message) => {
//     console.log(`Received message from ${message.from}: ${message.body}`);

//     // Responder al mensaje
//     if (message.body === "Hola") {
//       message.reply("¡Hola! ¿Cómo puedo ayudarte?");
//     } else if (message.body === "Adiós") {
//       message.reply("¡Hasta luego!");
//     }
//   });

//   client.on("ready", () => {
//     console.log("Conexion exitosa");

//     // Número al que quieres enviar el mensaje
//     const number = "51908902358";
//     // Formato requerido por whatsapp-web.js
//     const chatId = `${number}@c.us`;
//     // Mensaje a enviar
//     const message =
//       "Hola, este es un mensaje enviado a través de whatsapp-web.js";

//     client
//       .sendMessage(chatId, message)
//       .then((response) => {
//         if (response.id.fromMe) {
//           console.log("Mensaje enviado exitosamente.");
//         }
//       })
//       .catch((err) => {
//         console.error("Error al enviar el mensaje: ", err);
//       });
//   });
// */
