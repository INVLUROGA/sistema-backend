// Ruta /iclock/getrequest
const commandService = require("../../../services/commandService");

exports.fxget = async (req, res) => {
  try {
    console.log("-GET getrequest-");
    const DeviceSN = req.query.SN;

    let listCMD = "";
    if (!DeviceSN) {
      return res.status(400).send('El parámetro "DeviceSN" es requerido.');
    }

    const recentCommand = await commandService.getRecentCommandByDeviceSN(
      DeviceSN
    );
    console.log(recentCommand);

    if (recentCommand) {
      for (let i = 0; i < recentCommand.length; i++) {
        await commandService.deleteCommandById(recentCommand[i].Id);
        listCMD = listCMD + recentCommand[i].CMD + "\n";
      }
      res.send(listCMD);
    } else {
      res.send("OK");
    }
  } catch (err) {
    console.error("Error en la consulta del comando", err);
    res.status(500).send("Error en el servidor");
  }
};
