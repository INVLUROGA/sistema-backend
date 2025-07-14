const { request, response } = require("express");
const {
  bdBusquedaDni,
  bdDocBusqueda,
  bdBusquedaRuc,
} = require("../models/usuario/reniecBd");
const { default: axios } = require("axios");

const TOKEN_API = "luroga_3ufgcnjqs98ks";

const obtenerDatosReniec = async (req = request, res = response) => {
  try {
    const { numDoc, tipoDoc } = req.body;

    const tipoConfig = {
      dni: {
        campo: "dni",
        tipo: "dni",
        modelo: bdBusquedaDni,
        msg: "DNI encontrado",
      },
      ruc: {
        campo: "ruc",
        tipo: "ruc",
        modelo: bdBusquedaRuc,
        msg: "RUC encontrado",
      },
    };

    const config = tipoConfig[tipoDoc];
    if (!config) {
      return res.status(400).json({ msg: "Tipo de documento no soportado" });
    }

    const { campo, modelo, msg } = config;

    const existe = await bdDocBusqueda.findOne({
      where: { doc: numDoc, tipo_doc: tipoDoc },
    });

    const data = existe
      ? await modelo.findOne({ where: { [campo]: numDoc } })
      : await dataConsultas(tipoDoc, numDoc);

    res.status(201).json({ data, msg });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error al procesar la solicitud" });
  }
};

const dataConsultas = async (tipo_doc, num_doc) => {
  const tipoConfig = {
    dni: {
      campo: "dni",
      modelo: bdBusquedaDni,
    },
    ruc: {
      campo: "ruc",
      modelo: bdBusquedaRuc,
    },
  };

  const { data } = await axios.get(
    `http://go.net.pe:3000/api/v2/${tipo_doc}/${num_doc}`,
    {
      headers: {
        Authorization: `Bearer ${TOKEN_API}`,
      },
    }
  );

  const registroDoc = new bdDocBusqueda({ doc: num_doc, tipo_doc });
  await registroDoc.save();

  const registroDatos = new tipoConfig[tipo_doc].modelo(data.data);
  await registroDatos.save();

  return data.data;
};

module.exports = {
  obtenerDatosReniec,
};