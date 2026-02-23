const { request, response } = require("express");
const { AlertasUsuario } = require("../models/Auditoria");
const { enviarMensajesWsp } = require("../config/whatssap-web");
const { Op } = require("sequelize");

const recibirWebhookWsp = async (req = request, res = response) => {
    try {
        const data = req.body;

        // Validar estructura básica de UltraMsg webhook (ajustar según payload real)
        // Usualmente viene data.data para mensajes
        if (!data || !data.data) {
            return res.sendStatus(200);
        }

        const messageData = data.data;
        const type = data.type; // 'chat', 'image', 'interactive' etc.
        const from = messageData.from; // Número de telefono (e.g. 51999999999@c.us)
        const body = messageData.body; // Texto o respuesta del botón

        // Limpieza del número para coincidir con BD (eliminar @c.us y 51 si es necesario, pero nuestra BD guarda 933...)
        // Asumiremos que 'from' viene tipo "51933102718@c.us" y en BD está "933102718" (sin 51) o con 51. 
        // Ajuste rápido: extraer los últimos 9 dígitos si es Perú.
        let telefono = from.replace("@c.us", "");
        if (telefono.startsWith("51") && telefono.length === 11) {
            telefono = telefono.substring(2);
        }

        console.log("WEBHOOK WSP:", type, from, body);


        // Si el body viene de un botón ID, ej: `btn_si_105` o si simplemente escribió "SI"
        let cancelAll = false;
        let specificAlertId = null;

        if (body) {
            const bodyUpper = body.toUpperCase();
            if (bodyUpper === "SI") {
                cancelAll = true;
            } else if (body.startsWith("btn_si_")) {
                specificAlertId = parseInt(body.replace("btn_si_", ""), 10);
            }
        }

        if (cancelAll || specificAlertId) {

            const fechaInicioMes = new Date();
            fechaInicioMes.setDate(1);
            fechaInicioMes.setHours(0, 0, 0, 0);

            const fechaFinMes = new Date(fechaInicioMes);
            fechaFinMes.setMonth(fechaFinMes.getMonth() + 1);

            const usuario = await require("../models/Usuarios").Usuario.findOne({
                where: { telefono_user: telefono }
            });

            if (usuario) {
                const queryOptions = {
                    where: {
                        id_user: usuario.id,
                        id_estado: 1,
                        flag: true,
                        fecha: {
                            [Op.gte]: fechaInicioMes,
                            [Op.lt]: fechaFinMes
                        },
                        tipo_alerta: { [Op.in]: [1425] }
                    }
                };

                // Si viene el ID específico, lo agregamos al filtro
                if (specificAlertId) {
                    queryOptions.where.id = specificAlertId;
                }

                const alertasPendientes = await AlertasUsuario.findAll(queryOptions);

                if (alertasPendientes.length > 0) {
                    for (const alerta of alertasPendientes) {
                        await alerta.update({ id_estado: 3 }); // 3 = Cancelado por pago
                    }

                    await enviarMensajesWsp(from, "✅ ¡Gracias! Hemos registrado tu confirmación. Las alertas de este mes se han detenido.");
                    console.log(`Alertas canceladas para usuario ${usuario.id} (${telefono})`);
                }
            }
        }

        res.status(200).send("ok");
    } catch (error) {
        console.error("Error webhook wsp:", error);
        res.status(500).send("error");
    }
};

module.exports = {
    recibirWebhookWsp
};
