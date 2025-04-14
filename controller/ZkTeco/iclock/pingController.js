// Controlador para /iclock/ping
exports.fxget = (req, res) => {
  // DESCOMENTAR SI DESEA EXPANDIR EL DESARROLLO

  // console.log('-GET PING-');

  // const serial = req.query.SN;
  // const datos = req.body ? req.body : '';
  // console.log('Cuerpo de la solicitud POST:', datos);
  // const host = '8.8.8.8'; // Cambia por la IP que desees
  // ping.sys.probe(host, function(isAlive){
  //     const msg = isAlive ? `La IP ${host} está activa.` : `La IP ${host} no responde.`;
  //     console.log(msg);
  // });
  res.send("ok");
};
