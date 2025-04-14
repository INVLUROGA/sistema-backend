transactionService = require("../../../services/transactionService");
deviceService = require("../../../services/deviceService");
userService = require("../../../services/userService");
commandService = require("../../../services/commandService");
userdata64Service = require("../../../services/userdata64Service");

// Controlador para /iclock/cdata
exports.fxget = async (req, res) => {
  try {
    console.log("-GET DATA-");
    const serial = req.query.SN;
    console.log(serial);

    if (serial !== "") {
      if (await deviceService.checkDeviceStatus(serial)) {
        const respuesta = `GET OPTION FROM: ${serial}
ATTLOGStamp=0
OPERLOGStamp=0
ATTPHOTOStamp=None
IDCARDStamp=0
ERRORLOGStamp=0
ErrorDelay=30
Delay=10
TransTimes=00: 00;00: 00
TransInterval=1
TransFlag=TransData AttLog OperLog EnrollUser ChgUser EnrollFP ChgFP FPImag WORKCODE 
TimeZone=-5
Realtime=1
Encrypt=None`;

        console.log(respuesta);
        res.send(respuesta); // Enviar la respuesta al cliente
      } else {
        res.status(400).send("Serial not actived"); // Devolver un estado 400 si no hay serial
      }
    } else {
      res.status(400).send("Serial not provided"); // Devolver un estado 400 si no hay serial
    }
  } catch (err) {
    console.error("Error en la consulta del comando", err);
    res.status(500).send("Error en el servidor");
  }
};

// Ruta /iclock/cdata
exports.fxpost = async (req, res) => {
  try {
    console.log("-POST cdata-");
    const serial = req.query.SN;
    const table = req.query.table;

    if (table == "ATTLOG") {
      const trans = transactionService.segmentarTramaTrans(req.body);
      // Verificar que se hayan enviado los parámetros necesarios
      if (!trans) {
        return res.status(400).send("Faltan parámetros requeridos.");
      }

      // Llamar a la función del servicio para insertar la transacción
      await transactionService.insertTransaction(trans, serial);
      console.log("Transacción guardada satisfactoriamente");
    }

    // TABLA DE OPERACIONES
    else if (table === "OPERLOG") {
      const userinfo = userService.segmentarTramaUser(req.body);

      if (userinfo[0].Operator === "USER") {
        if (!userinfo[0].PIN) {
          return res
            .status(400)
            .json({ success: false, message: "Faltan parámetros requeridos." });
        }

        const userData = {
          UserCode: parseInt(userinfo[0].PIN), // Convertir PIN a número entero
          Name: userinfo[0].Name,
          Role: 0,
        };

        const newUser = await userService.createOrUpdateUser(userData);

        if (newUser.success === true) {
          for (let i = 0; i < userinfo.length; i++) {
            const cmd_create = `C:103:DATA UPDATE USERINFO PIN=${userinfo[i].PIN}\tName=${userinfo[i].Name}\tPri=${userinfo[i].Pri}\tPasswd=${userinfo[i].Passwd}\tCard=${userinfo[i].Card}\tGrp=${userinfo[i].Grp}\tTZ=${userinfo[i].TZ}\tVerify=${userinfo[i].Verify}\tViceCard=${userinfo[i].ViceCard}\tStartDatetime=${userinfo[i].StartDatetime}\tEndDatetime=${userinfo[i].EndDatetime}`;

            //EMITIR COMANDOS PARA TODOS LOS USUARIOS
            await commandService.broadCastCommand(cmd_create);
          }
        }
      }

      // OPERACION DE HUELLA
      else if (userinfo[0].Operator === "FP") {
        const newFP = await userdata64Service.checkOrInsertFP(userinfo);

        if (newFP.success === true) {
          for (let i = 0; i < userinfo.length; i++) {
            const cmd_create = `C:104:DATA UPDATE FINGERTMP PIN=${userinfo[i].PIN}\tFID=${userinfo[i].FID}\tSize=${userinfo[i].Size}\tValid=${userinfo[i].Valid}\tTMP=${userinfo[i].TMP}`;
            //EMITIR COMANDOS PARA TODOS LOS USUARIOS
            await commandService.broadCastCommand(cmd_create);
          }
        }
      }
      // OTRAS OPERACIONES
      else {
        console.log("OPERACION:", req.body);
      }
    }
    // TABLA DE OPCIONES DE CONFIGURACION
    else if (table == "options") {
      console.log("OPTIONS:", req.body);
    }

    // OTRAS TABLAS
    else {
      console.log("BODY POST:", req.body);
    }

    res.send("ok");
  } catch (err) {
    console.error("Error al insertar la transacción en la base de datos", err);
    res.status(500).send("Error en el servidor");
  }
};
