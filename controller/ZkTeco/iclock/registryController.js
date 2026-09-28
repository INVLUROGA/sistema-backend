const deviceService = require("../../../services/deviceService");
const accPushService = require("../../../services/accPushService");

// Controlador para /iclock/registry
exports.fxget = (req, res) => {
  // DESCOMENTAR SI DESEA EXPANDIR EL DESARROLLO   

  // console.log('-GET REGISTRY-');

  // const serial = req.query.SN;
  // const datos = req.body ? req.body : '';
  // console.log(datos);
  
  res.send('ok');
};

// POST /iclock/registry: registro de equipos de control de acceso (PUSH acc)
exports.fxpost = async (req, res) => {
  const serial = typeof req.query.SN === "string" ? req.query.SN.trim() : "";
  try {
    console.log("-POST REGISTRY-", serial);
    if (!serial || !(await deviceService.checkDeviceStatus(serial))) {
      console.warn(`[iclock/registry] SN no registrado o inactivo: ${serial}`);
      return res.status(400).type("text/plain").send("Serial not actived");
    }
    res.type("text/plain").send(`RegistryCode=${accPushService.registryCode(serial)}`);
  } catch (err) {
    console.error("Error en /iclock/registry", err);
    res.status(500).send("Error en el servidor");
  }
};

// POST /iclock/push: el equipo pide su configuración después de registrarse
exports.fxpush = async (req, res) => {
  const serial = typeof req.query.SN === "string" ? req.query.SN.trim() : "";
  try {
    console.log("-POST PUSH-", serial);
    if (!serial || !(await deviceService.checkDeviceStatus(serial))) {
      return res.status(400).type("text/plain").send("Serial not actived");
    }
    res.type("text/plain").send(accPushService.configuracionAcc(serial));
  } catch (err) {
    console.error("Error en /iclock/push", err);
    res.status(500).send("Error en el servidor");
  }
};
