const bizSdk = require("facebook-nodejs-business-sdk");
const { default: axios } = require("axios");
require("dotenv").config();
const env = process.env;

const accessToken = env.TOKEN_META;
const api = bizSdk.FacebookAdsApi.init(accessToken);
const AdAccount = bizSdk.AdAccount;
const Ad = bizSdk.Ad;
const Lead = bizSdk.Lead;

const FacturasMeta = async (
  fechaAntes = "2026-07-11",
  fechaDespues = "2026-07-12",
) => {
  const AD_ACCOUNT_ID = env.AD_ACCOUNT_ID_META;
  const TOKEN = accessToken;
  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/v24.0/${AD_ACCOUNT_ID}/insights`,
      {
        params: {
          level: "campaign",
          fields: `
            spend
          `,
          time_range: JSON.stringify({
            since: fechaAntes,
            until: fechaDespues,
          }),
          access_token: TOKEN,
        },
      },
    );

    console.log(JSON.stringify(data, null, 2));
    return {
      aaa: "000",
    };
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  FacturasMeta,
};
