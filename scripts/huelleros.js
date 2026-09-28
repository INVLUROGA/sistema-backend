// Muestra qué huelleros ZKTeco están en línea.
// Uso: npm run huelleros
const deviceService = require("../services/deviceService");

deviceService
  .listarDispositivosConEstado()
  .then((dispositivos) => {
    console.log(`\nEn línea = latido en los últimos ${deviceService.obtenerMinutosOffline()} min\n`);
    console.table(
      dispositivos.map((d) => ({
        SN: d.DeviceSN,
        Estado: d.estado === "online" ? "EN LÍNEA" : "fuera de línea",
        "Última conexión": d.ultima_conexion
          ? d.ultima_conexion.toLocaleString("es-PE", { timeZone: "America/Lima" })
          : "nunca",
        IP: d.ultima_ip || "-",
      }))
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error al consultar los huelleros", err.message);
    process.exit(1);
  });
