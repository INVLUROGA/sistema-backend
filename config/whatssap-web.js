const axios = require("axios");
const qs = require("qs");

const enviarMensajesWsp = async (numberWsp, bodyMsg) => {
  const data = qs.stringify({
    token: process.env.TOKEN_ULTRAMSG,
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

module.exports = {
  enviarMensajesWsp,
  enviarStickerWsp,
  enviarImagenWsp,
  enviarTextConImagenWsp,
  enviarDocumentoxWsp,
};
