const { request, response } = require("express");
const { Cliente, Usuario, Empleado } = require("../models/Usuarios");
const generarJWT = require("../helpers/jwt");
const jwt = require("jsonwebtoken");
const uuid = require("uuid");
const { Sequelize } = require("sequelize");
const {
  Venta,
  detalleVenta_membresias,
  detalleVenta_citas,
  detalleVenta_producto,
  detalleVenta_pagoVenta,
  detalle_cambioPrograma,
} = require("../models/Venta");
const {
  ProgramaTraining,
  SemanasTraining,
} = require("../models/ProgramaTraining");
const { extraerIpUser } = require("../helpers/extraerUser");
const { capturarAUDIT, capturarAccion } = require("../middlewares/auditoria");
const { typesCRUD } = require("../types/types");
const { Producto } = require("../models/Producto");
const { Inversionista } = require("../models/Ingresos");
const { Servicios } = require("../models/Servicios");
const { Files, ImagePT } = require("../models/Image");
const dayjs = require("dayjs");
const { Distritos } = require("../models/Distritos");
const {
  enviarMensajesWsp,
  enviarStickerWsp,
} = require("../config/whatssap-web");
const { Marcacion } = require("../models/Marcacion");
const { ExtensionMembresia } = require("../models/ExtensionMembresia");
const {
  ModulosVSseccion,
  rolesvsModulos,
  SeccionItem,
  ModuloItem,
} = require("../models/Seccion");
const { ContactoEmergencia } = require("../models/Modelos");
const { Parametros } = require("../models/Parametros");
const { AlertasUsuario } = require("../models/Auditoria");
const { obtenerUsuariosxCodigo } = require("../helpers/obtenerUsuariosxCodigo");
const { fechasAnteriores } = require("../helpers/fechasAnteriores");
// Función para contar días laborables entre dos fechas
function contarDiasLaborables(fechaInicio, fechaFin) {
  let inicio = dayjs(fechaInicio);
  let fin = dayjs(fechaFin);
  let diasLaborables = 0;

  console.log(inicio.isBefore(fin), inicio.isSame(fin, "day"));
  // Iterar entre las dos fechas
  while (inicio.isBefore(fin) || inicio.isSame(fin, "day")) {
    const diaSemana = inicio.day(); // .day() devuelve 0 (Dom) a 6 (Sab)

    // Verificar si es un día laborable (lunes a viernes: 1-5)
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasLaborables++;
    }

    // Avanzar al siguiente día
    inicio = inicio.add(1, "day");
  }

  return diasLaborables <= 0 ? 0 : diasLaborables;
}
const getUsuariosClientexID = async (req = request, res = response) => {
  try {
    const { id_cli } = req.params;
    const cliente = await Cliente.findByPk(id_cli, {
      attributes: [
        [
          Sequelize.fn(
            "CONCAT",
            Sequelize.col("nombre_cli"),
            " ",
            Sequelize.col("apPaterno_cli"),
            " ",
            Sequelize.col("apMaterno_cli")
          ),
          "nombres_apellidos_cli",
        ],
        "uid_comentario",
        "fecNac_cli",
        "fecha_nacimiento",
        "sexo_cli",
        "tipoDoc_cli",
        "numDoc_cli",
        "direccion_cli",
        "email_cli",
        "tel_cli",
      ],
    });
    if (!cliente) {
      return res.status(404).json({
        error: "El usuario cliente no existe",
      });
    }
    res.status(200).json({
      cliente,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de getusuarioClientes, hable con el administrador: ${error}`,
    });
  }
};
const postUsuarioCliente = async (req = request, res = response) => {
  const {
    uid_avatar,
    nombre_cli,
    apPaterno_cli,
    apMaterno_cli,
    fecNac_cli,
    fecha_nacimiento,
    estCivil_cli,
    sexo_cli,
    tipoDoc_cli,
    numDoc_cli,
    ubigeo_distrito_trabajo,
    nacionalidad_cli,
    ubigeo_distrito_cli,
    direccion_cli,
    tipoCli_cli,
    trabajo_cli,
    cargo_cli,
    tel_cli,
    email_cli,
  } = req.body;
  const { comentarioUnico_UID, contactoEmerg_UID, avatar_UID } = req;
  const { id_empresa } = req.params;
  try {
    const cliente = new Cliente({
      uid_avatar: avatar_UID,
      uid: uuid.v4(),
      nombre_cli,
      apMaterno_cli,
      apPaterno_cli,
      fecha_nacimiento,
      fecNac_cli,
      sexo_cli,
      estCivil_cli,
      tipoDoc_cli,
      numDoc_cli,
      nacionalidad_cli,
      direccion_cli,
      tipoCli_cli,
      trabajo_cli,
      cargo_cli,
      email_cli,
      tel_cli,
      ubigeo_distrito_cli,
      ubigeo_distrito_trabajo,
      uid_comentario: comentarioUnico_UID,
      uid_contactsEmergencia: contactoEmerg_UID,
      id_empresa,
    });
    await cliente.save();
    let formAUDIT = {
      id_user: req.id_user,
      ip_user: req.ip_user,
      accion: typesCRUD.POST,
      observacion: `Se registro: El cliente de id ${cliente.id_cli}`,
    };
    await capturarAUDIT(formAUDIT);

    if (cliente.tel_cli && id_empresa == 598) {
      await enviarMensajesWsp(
        cliente.tel_cli,
        `
        🎉 ¡BIENVENIDO/A A CHANGE - THE SLIM STUDIO! 🎉
        `
      );
      await enviarStickerWsp(
        cliente.tel_cli,
        "https://change-the-slim-studio-sigma.vercel.app/assets/mem_logo-be75730a.png"
      );
      await enviarMensajesWsp(
        cliente.tel_cli,
        `
¡Hola, ${cliente.nombre_cli.toUpperCase()}! 👋😃

Estamos muy contentos que formes parte de la comunidad de CHANGE !! . 💪✨ Este es TU primer GRAN paso hacia tu CAMBIO, y estamos aquí para acompañarte en todo TU proceso.

 ¿Qué te espera?

* Programas de entrenamiento diseñados para tus objetivos PERSONALES.
* Entrenamientos efectivos guiados por entrenadores profesionales.
* Evaluaciones nutricionales y seguimiento constante POR NUTRICIONISTAS Y POR NUESTRO SISTEMA COMPUTARIZADO DE MEDICION DE LA COMPOSICION CORPORAL.
* Un ambiente moderno, cómodo y motivador para sacar lo mejor de ti.
📲 Si tienes alguna consulta o necesitas apoyo, no dudes en comunicarte con nosotros. ¡Estamos aquí para ayudarte AL CAMBIO DE TU VIDA!

¡Prepárate para CHANGE, EL CAMBIO que mereces!

CHANGE - The Slim Studio
        `
      );
    }
    res.status(200).json({
      msg: "success",
      cliente,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de programa, hable con el administrador: ${error}`,
    });
  }
};
const getUsuarioClientes = async (req = request, res = response) => {
  const { id_empresa } = req.params;
  try {
    const clientes = await Cliente.findAll({
      attributes: [
        "uid",
        [
          Sequelize.fn(
            "CONCAT",
            Sequelize.col("nombre_cli"),
            " ",
            Sequelize.col("apPaterno_cli"),
            " ",
            Sequelize.col("apMaterno_cli"),
            " | ",
            Sequelize.col("numDoc_cli")
          ),
          "nombres_apellidos_cli",
        ],
        "tipoCli_cli",
        ["ubigeo_distrito_cli", "ubigeo_distrito"],
        "email_cli",
        "tel_cli",
        "createdAt",
        "updatedAt",
        ["estado_cli", "estado"],
      ],
      where: { flag: true, id_empresa: id_empresa },
      order: [["id_cli", "desc"]],
    });
    res.status(200).json({
      msg: "success",
      clientes,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de getusuarioClientes, hable con el administrador: ${error}`,
    });
  }
};
const getUsuarioCliente = async (req = request, res = response) => {
  try {
    const { uid_cliente } = req.params;
    const cliente = await Cliente.findOne({
      where: { flag: true, uid: uid_cliente },
      include: [
        {
          model: Venta,
          order: [["fecha_venta", "desc"]],
          include: [
            {
              model: detalleVenta_membresias,
              attributes: [
                "fec_inicio_mem",
                "fec_fin_mem",
                "id_pgm",
                "id_st",
                "id_tarifa",
                "tarifa_monto",
              ],
              include: [
                {
                  model: ProgramaTraining,
                  attributes: ["name_pgm"],
                },
                {
                  model: SemanasTraining,
                  attributes: ["semanas_st", "sesiones"],
                },
              ],
            },
            {
              model: Empleado,
              attributes: ["nombre_empl", "apPaterno_empl", "apMaterno_empl"],
            },
            {
              model: detalleVenta_citas,
              include: [
                {
                  model: Servicios,
                  attributes: ["tipo_servicio"],
                },
              ],
            },
            {
              model: detalleVenta_pagoVenta,
            },
            {
              model: detalleVenta_producto,
              attributes: [
                "id_venta",
                "id_producto",
                "cantidad",
                "precio_unitario",
                "tarifa_monto",
              ],
              include: [
                {
                  model: Producto,
                  attributes: ["id", "nombre_producto", "id_categoria"],
                },
              ],
            },
          ],
        },
        {
          model: ImagePT,
        },
        // {
        //   model: Venta,
        //   include: [
        //     {
        //       model: Empleado,
        //       attributes: ["nombre_empl", "apPaterno_empl", "apMaterno_empl"],
        //     },
        //     {
        //       model: detalleVenta_membresias,
        //       // attributes: [
        //       // ]
        //     },
        //     {
        //       model: detalleVenta_citas,
        //     },
        //     {
        //       model: detalleVenta_producto,
        //     },
        //     {
        //       model: detalleVenta_pagoVenta,
        //     },
        //   ],
        // },
      ],
    });
    res.status(200).json({
      msg: "success",
      cliente,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de getUsuarioCliente, hable con el administrador: ${error}`,
    });
  }
};
const deleteUsuarioCliente = async (req = request, res = response) => {
  const { uid_cliente } = req.params;
  try {
    const clienteDelete = await Cliente.findOne({
      where: { uid: uid_cliente, flag: true },
    });
    if (!clienteDelete) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un cliente con el id "${uid_cliente}"`,
      });
    }
    await clienteDelete.update({ flag: false });
    let formAUDIT = {
      id_user: req.id_user,
      ip_user: req.ip_user,
      accion: typesCRUD.DELETE,
      observacion: `Se elimino: El cliente de id ${clienteDelete.id_cli}`,
    };
    await capturarAUDIT(formAUDIT);
    res.status(200).json({
      msg: "Cliente eliminado",
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de deleteUsuarioCliente, hable con el administrador: ${error}`,
    });
  }
};
const putUsuarioCliente = async (req = request, res = response) => {
  const { uid_cliente } = req.params;
  try {
    const cliente = await Cliente.findOne({ where: { uid: uid_cliente } });
    let formAUDIT = {
      id_user: req.id_user,
      ip_user: req.ip_user,
      accion: typesCRUD.PUT,
      observacion: `Se actualizo: El cliente de id ${cliente.id_cli}`,
    };

    let formAUDIT2 = {
      id_user: req.id_user,
      ip_user: req.ip_user,
      accion: typesCRUD.PUT,
      arrayNuevo: {
        ...req.body,
      },
      arrayViejo: {
        ...cliente,
      },
      observacion: `Se edito: El cliente de id ${cliente.id}`,
    };
    await capturarAccion(formAUDIT2);
    await capturarAUDIT(formAUDIT);
    await cliente.update(req.body);
    res.status(200).json({
      msg: "success",
      cliente,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de putUsuarioCliente, hable con el administrador: ${error}`,
    });
  }
};
const obtenerDatosUltimaMembresia = async (req = request, res = response) => {
  try {
    const { id_cli } = req.params;
    const cliente = await Cliente.findOne({ where: { id_cli } });
    if (!cliente) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un cliente con el id "${uid_cliente}"`,
      });
    }
    const ultimaMembresia = await Venta.findOne({
      where: { id_cli: cliente.id_cli },
      order: [["id", "DESC"]],
      include: [
        {
          required: true,
          model: detalleVenta_membresias,
          attributes: [
            "fec_inicio_mem",
            "fec_fin_mem",
            "id_pgm",
            "id_st",
            "id_tarifa",
            "tarifa_monto",
          ],
          include: [
            {
              model: ProgramaTraining,
              attributes: ["name_pgm"],
            },
            {
              model: detalle_cambioPrograma,
              // required: false,
              as: "cambio_programa",
              attributes: ["id", "fecha_cambio", "id_pgm"],
            },
            {
              model: SemanasTraining,
              attributes: ["semanas_st", "sesiones"],
            },
            {
              model: ExtensionMembresia,
              attributes: [
                "tipo_extension",
                "id_venta",
                "extension_inicio",
                "extension_fin",
              ],
            },
          ],
        },
      ],
    });
    if (!ultimaMembresia) {
      return res.status(200).json({
        msg: "no hay ninguna membresia nueva",
      });
    }
    res.status(200).json({
      msg: "success",
      ultimaMembresia,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de obtenerDatosUltimaMembresia, hable con el administrador: ${error}`,
    });
  }
};
const obtenerMarcacionsCliente = async (req = request, res = response) => {
  try {
    const clientesxMarcacions = await Cliente.findAll({
      attributes: ["id_cli", "nombre_cli", "apPaterno_cli", "apMaterno_cli"],
      include: [
        {
          model: Marcacion,
          attributes: ["id", "tiempo_marcacion", "dni"],
          required: true,
        },
      ],
    });
    res.status(200).json(clientesxMarcacions);
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de obtenerDatosUltimaMembresia, hable con el administrador: ${error}`,
    });
  }
};
//Colaborador
const postUsuarioEmpleado = async (req = request, res = response) => {
  try {
    const { comentarioUnico_UID, contactoEmerg_UID, avatar_UID } = req;

    const empleado = new Empleado({
      uid: uuid.v4(),
      uid_avatar: avatar_UID,
      ...req.body,
      uid_comentario: comentarioUnico_UID,
      uid_contactsEmergencia: contactoEmerg_UID,
      fecha_nacimiento: req.body.fecNac_empl,
      fecContrato_empl: null,
      horario_empl: null,
      salario_empl: 0,
      tipoContrato_empl: 0,
    });
    await empleado.save();
    const usuariosParaAlerta = await AlertasUsuario.findAll({
      where: { mensaje: "1565" },
      raw: true,
    });
    const alertasDeCumpleanios = fechasAnteriores(
      req.body.fecNac_empl,
      3
    ).flatMap((aler, i) =>
      usuariosParaAlerta.map((us) => ({
        id_user: us.id_user,
        tipo_alerta: 1563,
        fecha: aler,
        mensaje: `CUMPLEAÑOS DE ${empleado.nombre_empl} en ${i} dias`,
        id_estado: 1,
        id_empl_cumple: empleado.id_empl,
      }))
    );
    console.log({
      fa: fechasAnteriores(req.body.fecNac_empl, 2),
      usuariosParaAlerta,
      alertasDeCumpleanios,
    });
    await AlertasUsuario.bulkCreate(alertasDeCumpleanios);
    res.status(200).json({
      msg: "success",
      empleado,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: `Error en el servidor, en controller de postUsuarioEmpleado, hable con el administrador: ${error}`,
    });
  }
};
const getUsuarioEmpleados = async (req = request, res = response) => {
  const { id_empresa, id_estado } = req.query;
  console.log(id_empresa, id_estado);

  try {
    const empleados = await Empleado.findAll({
      attributes: [
        "uid",
        "id_empl",
        "fecNac_empl",
        "fecha_nacimiento",
        "cargo_empl",
        "nombre_empl",
        "apPaterno_empl",
        "apMaterno_empl",
        [
          Sequelize.fn(
            "CONCAT",
            Sequelize.col("nombre_empl"),
            " ",
            Sequelize.col("apPaterno_empl"),
            " ",
            Sequelize.col("apMaterno_empl")
          ),
          "nombres_apellidos_empl",
        ],
        ["ubigeo_distrito_empl", "ubigeo_distrito"],
        "email_empl",
        "telefono_empl",
        "email_corporativo",
        "uid_contactsEmergencia",
        "id_empresa",
        ["estado_empl", "estado"],
      ],
      where: {
        id_empresa: id_empresa,
        estado_empl: id_estado,
        flag: true,
      },
      include: [
        {
          model: Distritos,
        },
        {
          model: ImagePT,
        },
      ],
      order: [["id_empl", "desc"]],
    });
    res.status(200).json({
      msg: "success",
      empleados: empleados,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: `Error en el servidor, en controller de getusuarioClientes, hable con el administrador: ${error}`,
    });
  }
};
const getUsuarioEmpleado = async (req = request, res = response) => {
  try {
    const { uid_empleado } = req.params;
    console.log(uid_empleado);

    const empleado = await Empleado.findOne({
      where: { flag: true, uid: uid_empleado },
      include: [
        {
          model: ImagePT,
        },
      ],
    });
    res.status(200).json({
      msg: "success",
      empleado,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: `Error en el servidor, en controller de getUsuarioEmpleado, hable con el administrador: ${error}`,
    });
  }
};
const deleteUsuarioEmpleado = (req = request, res = response) => {};
const putUsuarioEmpleado = async (req = request, res = response) => {
  const { uid_empleado } = req.params;
  try {
    const empleado = await Empleado.findOne({
      where: { uid: uid_empleado },
      include: [
        {
          model: ImagePT,
        },
      ],
    });
    empleado.update(req.body);
    res.status(200).json({
      msg: "success",
      empleado,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de putUsuarioCliente, hable con el administrador: ${error}`,
    });
  }
};
const postInversionista = async (req = request, res = response) => {
  const { nombres_completos, id_tipo_doc, numDoc, telefono, email } = req.body;
  try {
    const inversionista = new Inversionista({
      nombres_completos,
      id_tipo_doc,
      numDoc,
      telefono,
      email,
    });
    await inversionista.save();
    res.status(200).json({
      msg: "success",
      inversionista,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de postInversionista, hable con el administrador: ${error}`,
    });
  }
};
//Usuario
const postUsuario = async (req = request, res = response) => {
  const {
    nombres_user,
    apellidos_user,
    usuario_user,
    password_user,
    email_user,
    telefono_user,
    rol_user,
    notiPush_user,
    estado_user,
  } = req.body;
  try {
    let usuario = await Usuario.findOne({
      where: { usuario_user: usuario_user },
    });
    if (usuario) {
      return res.status(400).json({
        ok: false,
        msg: `el usuario que ingresaste esta duplicado, ${usuario_user}`,
      });
    }
    const uid = uuid.v4();
    usuario = new Usuario({
      nombres_user,
      apellidos_user,
      usuario_user,
      password_user,
      email_user,
      telefono_user,
      rol_user,
      notiPush_user,
      estado_user,
      uid: uid,
    });

    await usuario.save();
    res.status(201).json({
      ok: true,
      msg: "Usuario creado con exito",
      usuario: usuario,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de postUsuario, hable con el administrador: ${error}`,
    });
  }
};
const getUsuarios = async (req = request, res = response) => {
  try {
    let usuarios = await Usuario.findAll({
      where: { flag: true },
      attributes: [
        ["estado_user", "estado"],
        ["id_user", "id"],
        [
          Sequelize.fn(
            "CONCAT",
            Sequelize.col("nombres_user"),
            " ",
            Sequelize.col("apellidos_user")
          ),
          "nombres_apellidos_user",
        ],
        "email_user",
        "usuario_user",
        "uid",
      ],
    });
    res.status(200).json({
      ok: true,
      msg: "todo los usuarios",
      usuarios,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de getUsuarios, hable con el administrador: ${error}`,
    });
  }
};
const getUsuario = async (req = request, res = response) => {
  try {
    const { uid_user } = req.params;
    const usuario = await Usuario.findOne({
      flag: true,
      where: { uid: uid_user },
    });
    const modulos = await rolesvsModulos.findAll({
      flag: true,
      where: { id_rol: usuario.rol_user },
      include: [
        {
          model: ModuloItem,
        },
      ],
    });
    if (!usuario) {
      return res.status(404).json({
        msg: `No existe un programa con el id "${uid_user}"`,
      });
    }
    res.status(200).json({
      msg: "usuario present",
      usuario,
      modulos,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de getUsuario, hable con el administrador: ${error}`,
    });
  }
};
const deleteUsuario = async (req = request, res = response) => {
  const { id_user } = req.params;
  try {
    const usuario = await Usuario.findByPk(id_user, { flag: true });
    if (!usuario) {
      return res.status(404).json({
        msg: `No existe un programa con el id "${id_user}"`,
      });
    }
    pgm.update({ flag: false });
    res.status(200).json({
      msg: "usuario eliminado con exito",
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de deleteUsuario, hable con el administrador: ${error}`,
    });
  }
};

const putUsuario = async (req = request, res = response) => {
  const { id_user } = req.params;
  try {
    const usuario = await Usuario.findByPk(id_user, { flag: true });
    if (!usuario) {
      return res.status(404).json({
        msg: `No existe un programa con el id "${id_user}"`,
      });
    }
    pgm.update(req.body);
    res.status(200).json({
      msg: "usuario eliminado con exito",
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de deleteUsuario, hable con el administrador: ${error}`,
    });
  }
};
const loginUsuario = async (req = request, res = response) => {
  const { usuario_user, password_user } = req.body;

  try {
    let usuario = await Usuario.findOne({
      where: { usuario_user: usuario_user, flag: true },
    });
    if (!usuario) {
      return res.status(400).json({
        ok: false,
        msg: "El usuario no existe",
      });
    }
    if (password_user !== usuario.password_user) {
      return res.status(400).json({
        ok: false,
        msg: "Contraseña incorrecta",
      });
    }
    let ip_user = extraerIpUser(req, res);
    //Generate JWT token
    const token = await generarJWT(
      usuario.uid,
      usuario.nombres_user,
      usuario.rol_user,
      ip_user,
      usuario.id_user
    );
    const exp = jwt.decode(token).exp;
    let MODULOS_ITEMS = [];
    if (usuario.rol_user === 1) {
      MODULOS_ITEMS = [
        {
          name: "Ventas",
          path: "/venta",
          key: "mod-venta",
        },
      ];
    }
    if (usuario.rol_user === 2) {
      MODULOS_ITEMS = [
        {
          name: "Administracion",
          path: "/adm",
          key: "mod-adm",
        },
        {
          name: "Ventas",
          path: "/venta",
          key: "mod-venta",
        },
        {
          name: "RR.HH.",
          path: "/rrhh",
          key: "mod-rrhh",
        },
        {
          name: "INFORME GERENCIAL",
          path: "/informe-gerencial",
          key: "mod-informe-gerencial",
        },
      ];
    }
    if (usuario.rol_user === 3) {
      MODULOS_ITEMS = [
        {
          name: "Ventas",
          path: "/venta",
          key: "mod-general-ventas",
        },
      ];
    }

    if (usuario.rol_user === 7) {
      MODULOS_ITEMS = [
        {
          name: "MARKETING",
          path: "/marketing",
          key: "mod-marketing",
        },
        {
          name: "INVENTARIO",
          path: "/inventario",
          key: "mod-inventario-proyection",
        },
      ];
    }
    if (usuario.rol_user === 6) {
      MODULOS_ITEMS = [
        {
          name: "MUTRICION",
          path: "/nutricion",
          key: "mod-nutricion",
        },
      ];
    }
    if (usuario.rol_user === 5) {
      MODULOS_ITEMS = [
        {
          name: "INVENTARIO",
          path: "/inventario",
          key: "mod-inventario",
        },
      ];
    }
    if (usuario.rol_user === 8) {
      MODULOS_ITEMS = [
        {
          name: "RECEPCION",
          path: "/venta",
          key: "mod-recepcion",
        },
      ];
    }
    if (usuario.rol_user === 14) {
      MODULOS_ITEMS = [
        {
          name: "recepcion-mia",
          path: "/recepcion-mia",
          key: "mod-recepcion-mia",
        },
      ];
    }
    //mod-inventario-proyection
    let formAUDIT = {
      id_user: usuario.id_user,
      ip_user: ip_user,
      accion: typesCRUD.GET,
      observacion: `Usuario Ingresando`,
      fecha_audit: new Date(),
    };
    //await capturarAUDIT(formAUDIT);

    res.json({
      ok: true,
      uid: usuario.uid,
      rol_user: usuario.rol_user,
      name: usuario.nombres_user,
      MODULOS_ITEMS,
      token,
      exp,
    });
  } catch (error) {
    console.log(error, "Aca esta el Error");
    res.status(500).json({
      ok: false,
      msg: "Error a entrar",
    });
  }
};
const revalidarToken = async (req, res) => {
  const { uid, name, rol_user, id_user } = req;
  const user = await Usuario.findOne({ where: { uid: uid } });
  let ip_user = extraerIpUser(req, res);
  const token = await generarJWT(
    uid,
    user.name,
    user.rol_user,
    ip_user,
    user.id_user
  );
  let MODULOS_ITEMS = [];
  console.log(user);

  if (!user.flag) {
    res.status(400).json({
      ok: false,
      msg: "renewed",
    });
  }

  if (user.rol_user === 1) {
    MODULOS_ITEMS = [
      {
        name: "Ventas",
        path: "/venta",
        key: "mod-venta",
      },
    ];
  }
  if (user.rol_user === 2) {
    MODULOS_ITEMS = [
      {
        name: "Administracion",
        path: "/adm",
        key: "mod-adm",
      },
      {
        name: "Ventas",
        path: "/venta",
        key: "mod-venta",
      },
      {
        name: "RR.HH.",
        path: "/rrhh",
        key: "mod-rrhh",
      },
      {
        name: "INFORME GERENCIAL",
        path: "/informe-gerencial",
        key: "mod-informe-gerencial",
      },
    ];
  }

  if (user.rol_user === 54) {
    MODULOS_ITEMS = [
      {
        name: "Administracion",
        path: "/adm",
        key: "mod-adm",
      },
      {
        name: "Ventas",
        path: "/venta",
        key: "mod-venta",
      },
      {
        name: "RR.HH.",
        path: "/rrhh",
        key: "mod-rrhh",
      },
      {
        name: "INFORME GERENCIAL",
        path: "/informe-gerencial",
        key: "mod-informe-gerencial",
      },
    ];
  }

  if (user.rol_user === 14) {
    MODULOS_ITEMS = [
      {
        name: "recepcion-mia",
        path: "/recepcion-mia",
        key: "mod-recepcion-mia",
      },
    ];
  }
  if (user.rol_user === 3) {
    MODULOS_ITEMS = [
      {
        name: "Ventas",
        path: "/venta",
        key: "mod-general-ventas",
      },
    ];
  }
  if (user.rol_user === 8) {
    MODULOS_ITEMS = [
      {
        name: "recepcion",
        path: "/recepcion",
        key: "mod-recepcion",
      },
    ];
  }
  if (user.rol_user === 14) {
    MODULOS_ITEMS = [
      {
        name: "recepcion-mia",
        path: "/recepcion-mia",
        key: "mod-recepcion-mia",
      },
    ];
  }
  if (user.rol_user === 7) {
    MODULOS_ITEMS = [
      {
        name: "MARKETING",
        path: "/marketing",
        key: "mod-marketing",
      },
      {
        name: "INVENTARIO",
        path: "/inventario",
        key: "mod-inventario-proyection",
      },
    ];
  }
  if (user.rol_user === 5) {
    MODULOS_ITEMS = [
      {
        name: "CIRCUS",
        path: "/inventario",
        key: "mod-inventario",
      },
    ];
  }
  res.json({
    ok: true,
    msg: "renewed",
    rol_user,
    uid,
    name,
    token,
    MODULOS_ITEMS,
  });
};
const postFiles = async (req = request, res = response) => {
  const { observacion, tipo_doc, uid_File } = req.body;
  try {
    const files = new Files({
      uid_File,
      tipo_doc,
      uid: uuid.v4(),
      observacion,
    });
    await files.save();
    res.status(200).json({
      msg: "Files agregado con exito",
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de deleteUsuario, hable con el administrador: ${error}`,
    });
  }
};
const postPariente = async (req = request, res = response) => {
  try {
    const { uid_location, entidad } = req.query;
    const { id_tipo_pariente, nombres, telefono, email, comentario } = req.body;
    const contactoEmergencia = new ContactoEmergencia({
      id_tipo_pariente,
      nombres,
      telefono,
      email,
      comentario,
      uid_location,
      entidad,
    });
    await contactoEmergencia.save();
    res.status(201).json({
      msg: "ok",
      contactoEmergencia,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: `Error en el servidor, en controller de postPariente, hable con el administrador: ${error}`,
    });
  }
};
const getParientes = async (req = request, res = response) => {
  try {
    const { uid_location, entidad } = req.params;
    const contactosEmergencia = await ContactoEmergencia.findAll({
      where: { uid_location, entidad, flag: true },
      include: [
        {
          model: Parametros,
          as: "tipo_pariente",
        },
      ],
    });
    res.status(201).json({
      msg: "ok",
      contactosEmergencia,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: `Error en el servidor, en controller de getparientes, hable con el administrador: ${error}`,
    });
  }
};
const getPariente = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const contactoEmergencia = await ContactoEmergencia.findOne({
      where: { id },
    });
    res.status(201).json({
      contactoEmergencia,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: `Error en el servidor, en controller de getparientes, hable con el administrador: ${error}`,
    });
  }
};
const updatePariente = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const contactoEmergencia = await ContactoEmergencia.findOne({
      where: { id },
    });
    await contactoEmergencia.update(req.body);
    res.status(201).json({
      msg: "ok",
      contactoEmergencia,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: `Error en el servidor, en controller de postPariente, hable con el administrador: ${error}`,
    });
  }
};
const deletePariente = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const contactoEmergencia = await ContactoEmergencia.findOne({
      where: { id },
    });
    await contactoEmergencia.update({ flag: false });
    res.status(201).json({
      msg: "ok",
      contactoEmergencia,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: `Error en el servidor, en controller de postPariente, hable con el administrador: ${error}`,
    });
  }
};
const getParientesxEntidad = async (req = request, res = response) => {
  try {
    const { entidad } = req.params;
    console.log({ entidad });

    const contactosEmergencia = await ContactoEmergencia.findAll({
      where: { entidad, flag: true },
      include: [
        {
          model: Parametros,
          as: "tipo_pariente",
        },
      ],
    });
    res.status(201).json({
      msg: "ok",
      contactosEmergencia,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: `Error en el servidor, en controller de getparientes, hable con el administrador: ${error}`,
    });
  }
};
module.exports = {
  postFiles,
  postPariente,
  //Cliente
  postUsuarioCliente,
  getUsuarioClientes,
  getUsuarioCliente,
  deleteUsuarioCliente,
  putUsuarioCliente,
  getUsuariosClientexID,
  obtenerDatosUltimaMembresia,
  obtenerMarcacionsCliente,
  //Empleado
  postUsuarioEmpleado,
  getUsuarioEmpleados,
  getUsuarioEmpleado,
  deleteUsuarioEmpleado,
  putUsuarioEmpleado,
  //Inversionista
  postInversionista,
  //Usuario
  postUsuario,
  getUsuarios,
  getUsuario,
  deleteUsuario,
  putUsuario,
  loginUsuario,
  revalidarToken,
  getParientes,
  getPariente,
  updatePariente,
  deletePariente,
  getParientesxEntidad,
};
