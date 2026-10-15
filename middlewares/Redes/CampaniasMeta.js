const bizSdk = require("facebook-nodejs-business-sdk");
const { default: axios } = require("axios");
require("dotenv").config();
const env = process.env;

const accessToken = env.TOKEN_META
const api = bizSdk.FacebookAdsApi.init(accessToken);
const AdAccount = bizSdk.AdAccount;
const Ad = bizSdk.Ad;
const Lead = bizSdk.Lead;

const campaniasMeta = async (
  fechaAntes = "2026-05-01",
  fechaDespues = "2026-05-31",
) => {
  // totales de todas las campañas; devuelve undefined si falla la consulta a Meta
  try {
    const campanias = await campaniasMetaPorCampania(fechaAntes, fechaDespues);
    const importeGastado = campanias.reduce((total, c) => total + c.importeGastado, 0);
    const conversaciones = campanias.reduce((total, c) => total + c.conversaciones, 0);
    return {
      importeGastado,
      conversaciones,
      // costo real: gasto total / conversaciones totales
      costoxResultadoxCampanias: conversaciones
        ? Number((importeGastado / conversaciones).toFixed(2))
        : 0,
    };
  } catch (error) {
    console.log(error.response?.data ?? error);
  }
};

const ACCION_CONVERSACION = "onsite_conversion.messaging_conversation_started_7d";
const valorAccion = (lista, tipo) =>
  Number(lista?.find((f) => f.action_type === tipo)?.value ?? 0);

// Resultados de cada campaña entre dos fechas (YYYY-MM-DD).
// Recorre todas las páginas: insights devuelve 25 filas por página.
const campaniasMetaPorCampania = async (fechaAntes, fechaDespues) => {
  const AD_ACCOUNT_ID = env.AD_ACCOUNT_ID_META;
  const filas = [];
  let url = `https://graph.facebook.com/v24.0/${AD_ACCOUNT_ID}/insights`;
  let params = {
    level: "campaign",
    fields:
      "campaign_id,campaign_name,objective,spend,impressions,reach,clicks,ctr,actions,cost_per_action_type",
    time_range: JSON.stringify({ since: fechaAntes, until: fechaDespues }),
    limit: 100,
    access_token: accessToken,
  };
  while (url) {
    const { data } = await axios.get(url, { params });
    filas.push(...data.data);
    // la url de "next" ya trae todos los parametros
    url = data.paging?.next;
    params = undefined;
  }
  return filas
    .map((m) => {
      const importeGastado = Number(m.spend ?? 0);
      const conversaciones = valorAccion(m.actions, ACCION_CONVERSACION);
      return {
        id_campania: m.campaign_id,
        campania: m.campaign_name,
        objetivo: m.objective,
        importeGastado,
        impresiones: Number(m.impressions ?? 0),
        alcance: Number(m.reach ?? 0),
        clics: Number(m.clicks ?? 0),
        ctr: Number(m.ctr ?? 0),
        conversaciones,
        costoxConversacion: conversaciones
          ? Number((importeGastado / conversaciones).toFixed(2))
          : 0,
      };
    })
    .sort((a, b) => b.importeGastado - a.importeGastado);
};

module.exports = {
  campaniasMeta,
  campaniasMetaPorCampania,
};
