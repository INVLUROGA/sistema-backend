transactionService = require("../../../services/transactionService");
deviceService = require("../../../services/deviceService");
userService = require("../../../services/userService");
commandService = require("../../../services/commandService");
userdata64Service = require("../../../services/userdata64Service");
const heartbeatService = require("../../../services/heartbeatService");
const accPushService = require("../../../services/accPushService");
const accUserService = require("../../../services/accUserService");
const accHuellaService = require("../../../services/accHuellaService");

// Controlador para /iclock/cdata
exports.fxget = async (req, res) => {
  // Latido del equipo en segundo plano (no bloquea ni altera la respuesta)
  heartbeatService.registrarLatidoDesdeRequest(req, "iclock/cdata");
  try {
    console.log("-GET DATA-");
    const serial = req.query.SN;
    console.log({ serial });

    if (serial !== "") {
      console.log(await deviceService.checkDeviceStatus(serial), "problema?");

      if (
        req.query.DeviceType === "acc" &&
        (await deviceService.checkDeviceStatus(serial))
      ) {
        // Equipo de CONTROL DE ACCESO (PUSH acc): responde su configuración
        res.type("text/plain").send(accPushService.configuracionAcc(serial));
      } else if (await deviceService.checkDeviceStatus(serial)) {
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
        console.log("NO HAY SERIAL 1 -------------------");
        res.status(400).send("Serial not actived"); // Devolver un estado 400 si no hay serial
      }
    } else {
      console.log("NO HAY SERIAL 2 -------------------");

      res.status(400).send("Serial not provided"); // Devolver un estado 400 si no hay serial
    }
  } catch (err) {
    console.error("Error en la consulta del comando", err);
    res.status(500).send("Error en el servidor");
  }
};

// Ruta /iclock/cdata
exports.fxpost = async (req, res) => {
  // Latido del equipo en segundo plano (no bloquea ni altera la respuesta)
  heartbeatService.registrarLatidoDesdeRequest(req, "iclock/cdata");
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

    // EVENTOS EN TIEMPO REAL DE EQUIPOS DE CONTROL DE ACCESO (PUSH acc)
    else if (table === "rtlog") {
      const eventos = accPushService.segmentarTramaRtlog(req.body);
      for (const e of eventos) {
        console.log(
          `[iclock/cdata] Evento -> SN: ${serial} | PIN: ${e.UserCode} | Hora: ${e.timestamp} | event: ${e.event} | verifytype: ${e.verifytype}`
        );
      }
      // Solo se guardan como marcación los eventos con usuario identificado
      const marcaciones = eventos.filter((e) => e.UserCode > 0 && e.timestamp);
      if (marcaciones.length > 0) {
        await transactionService.insertTransaction(marcaciones, serial);
        // Si el PIN no está en zk_Users, pide sus datos al equipo (en segundo plano)
        accUserService
          .verificarUsuariosDesconocidos(serial, marcaciones.map((e) => e.UserCode))
          .catch((err) => console.error("[zk-usuarios] Error al verificar PIN", err));
      }
      return res.type("text/plain").send("OK");
    }

    // USUARIOS ENROLADOS EN EQUIPOS DE CONTROL DE ACCESO (PUSH acc)
    else if (table === "tabledata" && req.query.tablename === "user") {
      const usuarios = accUserService.segmentarTramaUsuarios(req.body);
      const guardados = await accUserService.guardarUsuarios(usuarios);
      console.log(`[zk-usuarios] ${guardados} usuarios recibidos de ${serial}`);
      return res.type("text/plain").send(`user=${usuarios.length}`);
    }

    // HUELLAS ENROLADAS EN EQUIPOS DE CONTROL DE ACCESO (PUSH acc)
    else if (table === "tabledata" && accHuellaService.TABLAS_HUELLAS.includes(req.query.tablename)) {
      const huellas = accHuellaService.segmentarTramaHuellas(req.body);
      const r = await accHuellaService.guardarHuellas(huellas);
      console.log(`[zk-huellas] ${serial}: ${r.nuevas} nuevas, ${r.actualizadas} actualizadas`);
      // Se confirma todo lo recibido (incluye rostros u otros tipos que no se guardan)
      return res
        .type("text/plain")
        .send(`${req.query.tablename}=${accHuellaService.contarRegistros(req.body)}`);
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
