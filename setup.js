// setup.js
// CORRER UNA SOLA VEZ, MANUALMENTE, para generar token.json con su refresh_token.

const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const TOKEN_PATH = "token.json";

async function setup() {
  const { client_secret, client_id, redirect_uris } = JSON.parse(
    fs.readFileSync("credentials.json"),
  ).installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0],
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
  console.log("Abre esta URL y autoriza:\n", authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const code = await new Promise((resolve) =>
    rl.question("\nPega aquí el código: ", resolve),
  );
  rl.close();

  const { tokens } = await oAuth2Client.getToken(code);

  if (!tokens.refresh_token) {
    console.warn(
      "\n⚠️  No se recibió refresh_token. Revoca el acceso en https://myaccount.google.com/permissions y vuelve a correr este script.",
    );
  }

  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log(`\n✅ Token guardado en ${TOKEN_PATH}.`);
}

setup().catch(console.error);

module.exports = {
  setup,
};
