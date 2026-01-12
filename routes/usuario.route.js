const { Router } = require("express");
const {
  postUsuarioCliente,
  getUsuarioClientes,
  getUsuarioCliente,
  putUsuarioCliente,
  deleteUsuarioCliente,
  postUsuarioEmpleado,
  getUsuarioEmpleados,
  getUsuarioEmpleado,
  putUsuarioEmpleado,
  deleteUsuarioEmpleado,
  postInversionista,
  postUsuario,
  getUsuario,
  getUsuarios,
  putUsuario,
  deleteUsuario,
  loginUsuario,
  getUsuariosClientexID,
  revalidarToken,
  obtenerDatosUltimaMembresia,
  obtenerMarcacionsCliente,
  postPariente,
  getParientes,
  getPariente,
  updatePariente,
  deletePariente,
  getParientesxEntidad
} = require("../controller/usuario.controller");
const {
  extraerComentarios,
  extraerContactoEmergencia,
  extraerUpload,
} = require("../middlewares/extraerComentarios");
const { validarJWT } = require("../middlewares/validarJWT");
const {
  insertarDatosSeguimientoDeClientes,
} = require("../middlewares/eventosCron");
const { check } = require("express-validator");
const { validarCampos } = require("../middlewares/validarCampos");
const {
  getobtenerPlanillaEmpleadoActivos,
} = require("../controller/recursosHumano");
const router = Router();
/**
 * [API Documentation]
 * /api/usuario
 */

router.post("/pariente", postPariente);
router.get(`/pariente/entidad/:entidad`, getParientesxEntidad);
router.get("/pariente/:id", getPariente);
router.get(`/pariente/:uid_location/:entidad`, getParientes);
router.put("/pariente/:id", updatePariente);
router.put("/pariente/delete/:id", deletePariente);
router.post(
  "/post-cliente/:id_empresa",
  validarJWT,
  (req, res, next) => {
    if (req.params.id_empresa === "599") {
      // Si es 599, omitir validaciones y continuar
      return next();
    }

    // Si no es 599, aplicar validaciones manualmente
    const validations = [
      check("name_image", "FALTA EL AVATAR DEL CLIENTE").not().isEmpty(),
      check("nombre_cli", "EL NOMBRE DEL CLIENTE ES OBLIGATORIO")
        .not()
        .isEmpty(),
      check("apPaterno_cli", "EL APELLIDO PATERNO DEL CLIENTE ES OBLIGATORIO")
        .not()
        .isEmpty(),
      check("apMaterno_cli", "EL APELLIDO MATERNO DEL CLIENTE ES OBLIGATORIO")
        .not()
        .isEmpty(),
      check(
        "fecha_nacimiento",
        "LA FECHA DE NACIMIENTO DEL CLIENTE ES OBLIGATORIA"
      )
        .not()
        .isEmpty(),
      check("estCivil_cli", "ELEGIR UN CORRECTO ESTADO CIVIL").not().isEmpty(),
      check("sexo_cli", "ELEGIR UN CORRECTO GENERO").not().isEmpty(),
      check("tipoDoc_cli", "ELEGIR UN CORRECTO TIPO DE DOCUMENTO")
        .not()
        .isEmpty(),
      check("numDoc_cli", "EL NUMERO DE DOCUMENTO DEBE SER EL CORRECTO")
        .not()
        .isEmpty(),
      check("nacionalidad_cli", "ELEGIR UNA CORRECTA NACIONALIDAD")
        .not()
        .isEmpty(),
      check("ubigeo_distrito_cli", "ELEGIR UN CORRECTO DISTRITO")
        .not()
        .isEmpty(),
      check("direccion_cli", "COMPLETAR EL CAMPO DIRECCION DEL CLIENTE")
        .not()
        .isEmpty(),
      check("tipoCli_cli", "ELEGIR UN CORRECTO TIPO DE CLIENTE")
        .not()
        .isEmpty(),
      check(
        "ubigeo_distrito_trabajo",
        "ELEGIR UN CORRECTO DISTRITO DE TRABAJO DEL CLIENTE"
      )
        .not()
        .isEmpty(),
      check("trabajo_cli", "COMPLETAR EL CAMPO DE TRABAJO").not().isEmpty(),
      check("cargo_cli", "COMPLETAR EL CAMPO DE CARGO").not().isEmpty(),
      check("email_cli", "EL EMAIL DEBE SER CORRECTO").isEmail(),
      check("tel_cli", "EL TELEFONO DEBE DE SER CORRECTO").not().isEmpty(),
    ];

    // Ejecutar los checks manualmente
    Promise.all(validations.map((validation) => validation.run(req)))
      .then(() => validarCampos(req, res, next))
      .catch(next);
  },
  extraerUpload,
  extraerComentarios,
  extraerContactoEmergencia,
  postUsuarioCliente
);
router.get("/get-marcacions/cliente", obtenerMarcacionsCliente);
router.get("/get-seguimiento-cliente", insertarDatosSeguimientoDeClientes);
router.get(
  "/get-ultima-membresia-cliente/:id_cli",
  obtenerDatosUltimaMembresia
);
router.get("/get-clientes/:id_empresa", getUsuarioClientes);
router.get("/get-cliente/:uid_cliente", getUsuarioCliente);
router.get("/get-cliente/id/:id_cli", getUsuariosClientexID);
router.put("/put-cliente/:uid_cliente", validarJWT, putUsuarioCliente);
router.get("/delete-cliente/:uid_cliente", validarJWT, deleteUsuarioCliente);
router.post("/post-file-dieta/:uid_location", validarJWT);

//usuario empleado
router.post(
  "/post-empleado",
  validarJWT,
  // extraerUpload,
  // extraerComentarios,
  // extraerContactoEmergencia,
  postUsuarioEmpleado
);
router.get("/get-empleados", validarJWT, getUsuarioEmpleados);
router.post(
  "/post-reporte-planilla-activos",
  getobtenerPlanillaEmpleadoActivos
);
router.get("/get-empleado/:uid_empleado", validarJWT, getUsuarioEmpleado);
router.put("/put-empleado/:uid_empleado", validarJWT, putUsuarioEmpleado);
router.get("/delete-empleado/:id_user", validarJWT, deleteUsuarioEmpleado);

//usuario inversionista
router.post("/post-inversionista", postInversionista);

//usuario login
router.post("/post-usuario", postUsuario);
router.get("/get-tb-usuarios", validarJWT, getUsuarios);
router.get("/get-usuario/:uid_user", getUsuario);
router.put("/put-usuario/:id_user", putUsuario);
router.post("/delete-usuario/:id_user", deleteUsuario);

router.post("/login", loginUsuario);
router.get("/renew", validarJWT, revalidarToken);

module.exports = router;
