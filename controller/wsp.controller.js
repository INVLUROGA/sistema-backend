const { request, response } = require("express");
const { enviarDocumentoxWsp } = require("../config/whatssap-web");

const postDocWsp = async (req = request, res = response) => {
  const { telefono, httpDoc } = req.body;
  try {
    await enviarDocumentoxWsp(telefono, httpDoc);
    res.status(201).json({
      msg: "ok",
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      ok: false,
    });
  }
};
module.exports = {
  postDocWsp,
};
