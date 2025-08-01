exports.urls = {
  host: "http://localhost",
  apiImg: "/api/file/",
};

exports.messageWSP = {
  mensajeCitaRegistrada: (
    tb_empleado,
    tb_cliente,
    fecha_inicio = "MARTES 27 de mayo a las 12:30 PM",
    servicios = []
  ) => {
    const { nombre_empl, sexo_empl } = tb_empleado;
    const { nombre_cli } = tb_cliente;
    const serviciosTexto = servicios
      .map((servicio, index) => `${index + 1}. ${servicio.label.trim()}`)
      .join("\n");
    return `
¡Hola ${
      nombre_cli.charAt(0).toUpperCase() + nombre_cli.slice(1).toLowerCase()
    }! 👋🏻😃
Te confirmamos que la cita para realizarte los siguientes servicios, con ${sexo_empl == 8 ? "nuestro" : ""} ${
      sexo_empl == 9 ? "nuestra" : ""
    } ESTILISTA ${
      nombre_empl.split(" ")[0]
    }, en CIRCUS SALON 🎪, ya está agendada para el día ${fecha_inicio}. VIVE LA MAGIA 🪄🎩 EN CIRCUS SALON! ✨ 
${serviciosTexto}

Dirección: Av. Reducto 1455 - Miraflores
¡TE ESPERAMOS! 😊🎪✨
    `;
  },
  mensajeCitaRegistrada__clienteasistio: (tb_cliente) => {
    const { nombre_cli } = tb_cliente;
    return `
¡Hola ${
      nombre_cli.charAt(0).toUpperCase() + nombre_cli.slice(1).toLowerCase()
    }! 👋🏻😃,
Gracias por asistir a su cita el día de hoy 😃.
Esperamos que su experiencia haya sido MÁGICA 🪄🎩. Si tiene alguna recomendación que nos ayude a seguir mejorando, se lo agradeceríamos mucho. Asimismo, si desea agendar una próxima cita, no dude en comunicarse con nosotros.

¡Que tenga un excelente día!
Saludos,
CIRCUS SALON 🎪✨
    `;
  },
  mensajeCitaRegistrada__clientereprograma: (
    tb_empleado,
    tb_cliente,
    fecha_inicio = "MARTES 27 de mayo a las 12:30 PM",
    servicios = []
  ) => {
    const { nombre_empl, sexo_empl } = tb_empleado;
    const { nombre_cli } = tb_cliente;
    const serviciosTexto = servicios
      .map((servicio, index) => `${index + 1}. ${servicio.label.trim()}`)
      .join("\n");
    return `
¡Hola ${nombre_cli}! 👋🏻😃,
Gracias por asistir a su cita el día de hoy 😃.
Esperamos que su experiencia haya sido MÁGICA 🪄🎩. Si tiene alguna recomendación que nos ayude a seguir mejorando, se lo agradeceríamos mucho. Asimismo, si desea agendar una próxima cita, no dude en comunicarse con nosotros.

¡Que tenga un excelente día!
Saludos,
CIRCUS SALON 🎪✨
    `;
  },

  mensajeCitaRegistradaParaEmpl: (
    tb_empleado,
    tb_cliente,
    fecha_inicio = "MARTES 27 de mayo a las 12:30 PM",
    servicios = []
  ) => {
    const { nombre_empl, sexo_empl } = tb_empleado;
    const { nombre_cli, sexo_cli } = tb_cliente;
    const serviciosTexto = servicios
      .map((servicio, index) => `${index + 1}. ${servicio.label.trim()}`)
      .join("\n");
    return `
¡Hola ${nombre_empl}! 🎪✨
Te recordamos que el dia ${fecha_inicio.toLocaleUpperCase()} tienes la cita con ${
      sexo_cli == 8 ? "nuestro" : ""
    } ${
      sexo_cli == 9 ? "nuestra" : ""
    } cliente ${nombre_cli} para los siguientes servicios: 
${serviciosTexto}
Toma en cuenta que cada servicio que realizas no está solo EL NOMBRE DE CIRCUS EN JUEGO SINO TAMBIEN TU NOMBRE, TU PRESTIGIO Y TU FAMA
¡ESPERAMOS DE TI, LO MEJOR!
¡Gracias! 😃💪💪
    `;
  },
  mensaje24hAntesDeLaReserva: (
    tb_empleado,
    tb_cliente,
    fecha_inicio = "MARTES 27 de mayo a las 12:30 PM",
    servicios = []
  ) => {
    const { nombre_empl, sexo_empl } = tb_empleado;
    const { nombre_cli } = tb_cliente;
    const nombre_empleado = nombre_empl.split(" ")[0];
    return `
Hola ${
      nombre_cli.charAt(0).toUpperCase() + nombre_cli.slice(1).toLowerCase()
    }! RECUERDA que tu experiencia mágica 🪄🎩 está agendada para MAÑANA. Si tienes algún inconveniente por favor comunícate al número de Recepción al 912530886, MUCHAS GRACIAS!😊🎪✨
    
    `;
  },
  mensaje2hAntesDeLaReserva: (
    tb_empleado,
    tb_cliente,
    fecha_inicio = "MARTES 27 de mayo a las 12:30 PM",
    servicios = []
  ) => {
    const { nombre_empl, sexo_empl } = tb_empleado;
    const { nombre_cli } = tb_cliente;
    const serviciosTexto = servicios;
    const nombre_empleado = nombre_empl
      .split(" ")[0]
      .map((servicio, index) => `${index + 1}. ${servicio.label.trim()}`)
      .join("\n");
    return `
¡Hola ${
      nombre_cli.charAt(0).toUpperCase() + nombre_cli.slice(1).toLowerCase()
    }! Recuerda que te estaremos esperando para tu 
cita con nuestro ESTILISTA ${
      nombre_empleado.charAt(0).toUpperCase() +
      nombre_empleado.slice(1).toLowerCase()
    } en CIRCUS SALON 🎪, tu experiencia mágica 🪄🎩 está programada para el día ${fecha_inicio}. Si tienes algún inconveniente por favor comunícate al número de Recepción 912530886, MUCHAS GRACIAS!😊✨
    `;
  },
  mensaje2hDespuesDeLaReservaParaEmpl: (
    tb_empleado,
    tb_cliente,
    fecha_inicio = "MARTES 27 de mayo a las 12:30 PM",
    servicios = []
  ) => {
    const { nombre_empl, sexo_empl } = tb_empleado;
    const { nombre_cli } = tb_cliente;
    const serviciosTexto = servicios;
    const nombre_empleado = nombre_empl
      .split(" ")[0]
      .map((servicio, index) => `${index + 1}. ${servicio.label.trim()}`)
      .join("\n");
    return `
¡Hola ${nombre_cli.charAt(0).toUpperCase() + nombre_cli.slice(1).toLowerCase()}!
Faltan 2 HORAS para tu cita con nuestro ESTILISTA ${
      nombre_empl.split(" ")[0]
    } en CIRCUS SALON, RECUERDA que tu experiencia mágica está programada para el día ${fecha_inicio.toUpperCase()}. Si tienes algún inconveniente por favor comunícate al número de Recepción al 912530886, MUCHAS GRACIAS!😃🎪✨
    `;
  },
};

exports.typesCRUD = {
  POST: 1,
  PUT: 2,
  GET: 3,
  DELETE: 4,
  PATCH: 5,
};
