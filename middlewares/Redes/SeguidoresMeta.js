const { default: axios } = require("axios");
require("dotenv").config();
const env = process.env;

// Página de Facebook "CHANGE - The Slim Studio" (su Instagram vinculado es @change.com.pe)
const ID_PAGINA_FACEBOOK = "392407903947837";

// Seguidores actuales de la página de Facebook y de su cuenta de Instagram.
// Lanza error si falla la consulta a Meta.
const seguidoresMeta = async () => {
  const { data } = await axios.get(
    `https://graph.facebook.com/v24.0/${ID_PAGINA_FACEBOOK}`,
    {
      params: {
        fields:
          "followers_count,instagram_business_account{username,followers_count}",
        access_token: env.TOKEN_META,
      },
    },
  );
  return {
    facebook: data.followers_count,
    instagram: data.instagram_business_account?.followers_count,
  };
};

module.exports = {
  seguidoresMeta,
};
