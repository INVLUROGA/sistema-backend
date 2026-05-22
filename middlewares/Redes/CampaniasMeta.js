const bizSdk = require("facebook-nodejs-business-sdk");
const { default: axios } = require("axios");

const accessToken =
  "EAAS2ZA7oAJgoBRZASaPuXYaKUEraJXPkUZCMjvvNqrZA4yvAwmczFBS6DA6PONBNqyZB5fjBm9cJCpBpOQQpSkM7A5CoYW8ahxrYZB1bT1G5vVwiLHZAT6nedoXM46ZANZC6635qSCIHo3mnEf1CZAbOAkIDQ9PjoaZAehnRJeATfiK4VqI5ycsQG7SWZCIEqpbq6wZDZD";
const api = bizSdk.FacebookAdsApi.init(accessToken);
const AdAccount = bizSdk.AdAccount;
const Ad = bizSdk.Ad;
const Lead = bizSdk.Lead;

const campaniasMeta = async (
  fechaAntes = "2026-05-01",
  fechaDespues = "2026-05-31",
) => {
  const AD_ACCOUNT_ID = "act_3401374960165898";
  const TOKEN = accessToken;
  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/v24.0/${AD_ACCOUNT_ID}/insights`,
      {
        params: {
          level: "campaign",
          fields: `
            campaign_name,
            spend,
            impressions,
            clicks,
            actions,
            cost_per_action_type
          `,
          time_range: JSON.stringify({
            since: fechaAntes,
            until: fechaDespues,
          }),
          access_token: TOKEN,
        },
      },
    );

    const conversacionesxCampanias = data.data.map((m) => {
      return {
        actions: Number(
          m.actions.find(
            (f) =>
              f.action_type ===
              "onsite_conversion.messaging_conversation_started_7d",
          ).value,
        ),
      };
    });
    const costoxResultadoxCampanias = data.data.map((m) => {
      return {
        actions: Number(
          m.cost_per_action_type.find(
            (f) =>
              f.action_type ===
              "onsite_conversion.messaging_conversation_started_7d",
          )?.value,
        ),
      };
    });
    const importeGastado = data.data.map((m) => {
      return {
        actions: Number(m.spend),
      };
    });
    console.log(JSON.stringify(importeGastado, null, 2));

    return {
      importeGastado: importeGastado.reduce(
        (total, item) => total + item.actions,
        0,
      ),
      conversaciones: Number(
        conversacionesxCampanias.reduce(
          (total, item) => total + item.actions,
          0,
        ),
      ),
      costoxResultadoxCampanias: costoxResultadoxCampanias.reduce(
        (total, item) => total + item.actions,
        0,
      ),
    };
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  campaniasMeta,
};
