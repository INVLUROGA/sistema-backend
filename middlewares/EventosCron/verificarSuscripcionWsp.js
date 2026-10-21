require("dotenv").config();
const axios = require("axios");

// Cuenta de WhatsApp Business (WABA) del número +51 908 902 358
const WABA_ID = process.env.WSP_CLOUD_WABA_ID || "351339624731448";
const URL_SUSCRIPCION = `https://graph.facebook.com/v24.0/${WABA_ID}/subscribed_apps`;

/**
 * Meta a veces quita la app de la WABA (p. ej. al re-vincular el número en la app del celular)
 * y el webhook deja de recibir mensajes sin avisar. Si la WABA se quedó sin apps suscritas,
 * se vuelve a suscribir la app del WSP_CLOUD_TOKEN.
 */
const verificarSuscripcionWsp = async () => {
  const access_token = process.env.WSP_CLOUD_TOKEN;
  if (!access_token) return;
  try {
    const { data } = await axios.get(URL_SUSCRIPCION, { params: { access_token } });
    if (data.data?.length) return;
    await axios.post(URL_SUSCRIPCION, null, { params: { access_token } });
    console.log(`[wsp] la WABA ${WABA_ID} no tenía apps suscritas: se volvió a suscribir`);
  } catch (error) {
    console.log("[wsp] no se pudo verificar la suscripción:", error.response?.data?.error?.message || error.message);
  }
};

module.exports = { verificarSuscripcionWsp };
