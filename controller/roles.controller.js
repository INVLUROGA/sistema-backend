const { response, request } = require("express");
const {
  SeccionItem,
  ModulosVSseccion,
  rolesvsModulos,
  Role,
  ModuloItem,
} = require("../models/Seccion");
const { Usuario } = require("../models/Usuarios");

const seccionPOST = async (req = response, res = response) => {
  try {
    const seccion = new SeccionItem(req.body);
    res.status(200).json({
      msg: "success",
      seccion,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de seccionPOST, hable con el administrador: ${error}`,
    });
  }
};
const moduloPOST = async (req = response, res = response) => {
  try {
    const modulosStory = new ModulosVSseccion(req.body);
    res.status(200).json({
      msg: "success",
      modulosStory,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de moduloPOST, hable con el administrador: ${error}`,
    });
  }
};
const rolPOST = async (req = response, res = response) => {
  try {
    const rolStory = new rolesvsModulos(req.body);
    res.status(200).json({
      msg: "success",
      rolStory,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de moduloPOST, hable con el administrador: ${error}`,
    });
  }
};

const obtenermoduloxRole = async (req, res) => {
  try {
    const { uid } = req.params;

    const usuario = await Usuario.findOne({ where: { uid: uid } });
    console.log(
      usuario.rol_user,
      "usuario.role_userusuario.role_userusuario.role_userusuario.role_userusuario.role_userusuario.role_userusuario.role_userusuario.role_userusuario.role_userusuario.role_userusuario.role_userusuario.role_userusuario.role_userusuario.role_user",
    );
    // Se consulta el rol e incluye la asociación de módulos (alias: modules)
    const role = await Role.findByPk(usuario.rol_user, {
      include: [
        {
          model: ModuloItem,
          as: "modules",
          through: { attributes: [] }, // Excluye los atributos de la tabla intermedia
        },
      ],
    });

    if (!role) {
      return res.status(404).json({ message: "Rol no encontrado" });
    }
    console.log({ role });

    // Retornamos los módulos asociados al rol
    res.json({ modules: role.modules });
  } catch (error) {
    console.log(error);
  }
};

const seccionGET = async (req = request, res = response) => {
  const { modulo } = req.params;
  try {
    let MENU_ITEMS = [];
    if (modulo === "mod-nutricion") {
      MENU_ITEMS = [
        {
          key: "cita",
          label: "Citas",
          url: "/citas",
          icon: "uil-home-alt",
          children: [
            {
              key: "citas-NUT",
              label: "Citas nutricionista",
              isTitle: false,
              icon: "uil-calender",
              url: "/crear-citas-nutricion",
            },
            {
              key: "hist-citas-NUT",
              label: "Historial de citas nutricionista",
              isTitle: false,
              icon: "uil-calender",
              url: "/history-citas-nutricion",
            },
          ],
        },
        {
          key: "cliente",
          label: "Socios",
          url: "/socio",
          icon: "uil-home-alt",
          children: [
            {
              key: "cliente-gestion-socios",
              label: "Gestion de socios",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-clientes",
            },
            {
              key: "cliente-contratos",
              label: "Contratos de socios",
              isTitle: false,
              icon: "uil-calender",
              url: "/contrato-clientes",
            },
          ],
        },
      ];
    }
    if (modulo === "mod-venta") {
      MENU_ITEMS = [
        {
          key: "ventas",
          label: "Ventas",
          url: "/ventas",
          icon: "uil-home-alt",
          children: [
            {
              key: "ventas-nuevaVenta",
              label: "Nueva venta",
              icon: "uil-calender",
              url: "/nueva-venta",
              parentKey: "ventas-nueva-venta",
            },
            {
              key: "gestion-ventas",
              label: "Ventas",
              icon: "uil-calender",
              url: "/gestion-ventas",
              parentKey: "ventas-gestion-ventas",
            },
            {
              key: "ventas-seguimiento",
              label: "Seguimiento",
              icon: "uil-calender",
              url: "/seguimiento",
              parentKey: "ventas-seguimiento",
            },
          ],
        },
        {
          key: "cliente",
          label: "Socios",
          url: "/socio",
          icon: "uil-home-alt",
          children: [
            {
              key: "cliente-gestion-socios",
              label: "Gestion de socios",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-clientes",
            },
            {
              key: "cliente-contratos",
              label: "Contratos de socios",
              isTitle: false,
              icon: "uil-calender",
              url: "/contrato-clientes",
            },
          ],
        },
        {
          key: "cita",
          label: "Citas",
          url: "/citas",
          icon: "uil-home-alt",
          children: [
            {
              key: "citas-NUT",
              label: "Citas nutricionista",
              isTitle: false,
              icon: "uil-calender",
              url: "/crear-citas-nutricion",
            },
            {
              key: "hist-citas-NUT",
              label: "Historial de citas nutricionista",
              isTitle: false,
              icon: "uil-calender",
              url: "/history-citas-nutricion",
            },
          ],
        },
        {
          key: "cong-reg",
          label: "gestión CAMBIOS",
          icon: "uil-home-alt",
          children: [
            {
              key: "canje-gestion",
              label: "Gestion de canjes",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-canjes",
            },
            {
              key: "canje-reporte",
              label: "REPORTE DE CANJE",
              isTitle: false,
              icon: "uil-calender",
              url: "/reporte-canje",
            },
            {
              key: "congreg",
              label: "Congelamientos y regalos",
              isTitle: false,
              icon: "uil-calender",
              url: "/extension-membresia",
            },
          ],
        },
      ];
    }
    if (modulo === "mod-adm") {
      MENU_ITEMS = [
        {
          key: "movimiento",
          label: "Ingresos y Egresos",
          url: "/movimiento",
          icon: "uil-calender",
          children: [
            {
              key: "gestion-compra",
              label: "Registro de compra",
              isTitle: false,
              icon: "uil-calender",
              url: "/orden-compra",
            },
            {
              key: "gestion-egresos",
              label: "Egresos",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-egresos",
            },
            {
              key: "gestion-ingresos",
              label: "Ingresos",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-ingresos",
            },
          ],
        },
        {
          key: "inventario",
          label: "INVENTARIO",
          url: "/inventario",
          icon: "uil-calender",
          children: [
            {
              //key: "reporte-utilidad-pgm",
              label: "GESTION DE INVENTARIO",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-inventario",
            },
            {
              //key: "reporte-utilidad-pgm",
              label: "AUDITORIA INVENTARIO",
              isTitle: false,
              icon: "uil-calender",
              url: "/auditoria-inventario",
            },
            {
              //key: "reporte-utilidad-pgm",
              label: "ENTRADA DE ITEMS",
              isTitle: false,
              icon: "uil-calender",
              url: "/entrada-inventario",
            },
            {
              //key: "reporte-utilidad-pgm",
              label: "SALIDA DE ITEMS",
              isTitle: false,
              icon: "uil-calender",
              url: "/salida-inventario",
            },
            {
              //key: "reporte-utilidad-pgm",
              label: "TRANSFERENCIA DE ITEMS",
              isTitle: false,
              icon: "uil-calender",
              url: "/transferencia-inventario",
            },
            {
              //key: "reporte-utilidad-pgm",
              label: "INVENTARIO TOTALIZADO",
              isTitle: false,
              icon: "uil-calender",
              url: "/totalizado-inventario",
            },
            {
              //key: "reporte-utilidad-pgm",
              label: "GENERADOR DE FECHAS INVENTARIO",
              isTitle: false,
              icon: "uil-calender",
              url: "/generador-fechas-inventario",
            },
          ],
        },
        {
          key: "reporte-admin",
          label: "Reportes",
          url: "/reportes-admin",
          icon: "uil-calender",
          children: [
            {
              key: "reporte-flujo-caja",
              label: "FLUJO DE CAJA",
              icon: "uil-calender",
              url: "/reporte-admin/flujo-caja",
              parentKey: "reporte-fc",
            },
            {
              key: "reporte-gerencial",
              label: "Gerencial",
              isTitle: false,
              icon: "uil-calender",
              url: "/reporte-admin/reporte-gerencial",
            },
            {
              key: "gestion-lead",
              label: "gestion de lead",
              isTitle: false,
              icon: "uil-calender",
              url: "/reporte-admin/gestion-lead",
            },
          ],
        },

        {
          key: "cuentas-balances",
          label: "Cuentas Balances",
          icon: "uil-calender",
          url: "/cuentas-balances",
          children: [
            {
              key: "reporte-cuentas-balance",
              label: "reporte Cuentas balance",
              isTitle: false,
              icon: "uil-calender",
              url: "/reporte-cuentas-balance",
            },
            {
              key: "cuentas-cobrar",
              label: "Cuentas por cobrar",
              isTitle: false,
              icon: "uil-calender",
              url: "/cuentas-cobrar",
            },
            {
              key: "cuentas-pagar",
              label: "Cuentas por pagar",
              isTitle: false,
              icon: "uil-calender",
              url: "/cuentas-pagar",
            },
          ],
        },
        {
          key: "prov",
          label: "Proveedores",
          icon: "uil-calender",
          url: "/prov",
          children: [
            {
              key: "gestion-ingresantes-activo",
              label: "INGRESANTES activos",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-ingresantes-activo",
            },
            {
              key: "gest-prov",
              label: "Proveedores activos",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-proveedores-activo",
            },
            {
              key: "gest-prov",
              label: "Proveedores Inactivos",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-proveedores-inactivo",
            },
            {
              key: "reporte-cuentas-pagar-prov",
              label: "cuentas por pagar",
              isTitle: false,
              icon: "uil-calender",
              url: "/reporte-cuentas-pagar-prov",
            },
            {
              key: "gest-contratos-proveedores",
              label: "contratos de proveedores",
              isTitle: false,
              icon: "uil-calender",
              url: "/contratos-prov",
            },
            {
              key: "gest-deudas-prov",
              label: "deudas de proveedores",
              isTitle: false,
              icon: "uil-calender",
              url: "/deudas-proveedores",
            },
            {
              key: "gest-prov-compromiso-pago",
              label: "compromiso de pago",
              isTitle: false,
              icon: "uil-calender",
              url: "/compromiso-pago",
            },
            {
              key: "gest-prov",
              label: "FORMATO DE DECLARACIÓN JURADA PROVEEDOR",
              isTitle: false,
              icon: "uil-calender",
              url: "/declaracion-jurada",
            },
            {
              key: "gest-prov",
              label: "MODELO DE CONTRATO",
              isTitle: false,
              icon: "uil-calender",
              url: "/modelo-contrato",
            },
            {
              key: "trab-prov",
              label: "gastos ",
              isTitle: false,
              icon: "uil-calender",
              url: "/proveedores/prov-agentes",
            },
          ],
        },
        {
          key: "gest-serv",
          label: "Gestion de servicios",
          url: "/gestion-servicios",
          icon: "uil-calender",
          children: [
            {
              key: "gestion-pgms",
              label: "Gestion de programas",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-programas",
            },
            {
              key: "gestion-prds",
              label: "Productos",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-productos",
            },
            {
              key: "serv-tratamientos-esteticos",
              label: "Tratamientos Esteticos",
              isTitle: false,
              icon: "uil-calender",
              url: "/tratamientos-esteticos",
            },
            {
              key: "serv-nutri",
              label: "Nutricion",
              isTitle: false,
              icon: "uil-calender",
              url: "/serv-nutricion",
            },
          ],
        },
        {
          key: "otros",
          label: "Otros",
          url: "/otros",
          icon: "uil-calender",
          children: [
            {
              key: "adm-gestionDct",
              label: "Impuestos",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-descuentos",
            },
            {
              key: "adm-gestionComisional",
              label: "Comisiones",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-comisional",
            },
          ],
        },
        {
          key: "config",
          label: "Configuración",
          url: "/config",
          icon: "uil-calender",
          children: [
            {
              key: "gestion-alerta-usuario",
              label: "gestion alertas De Usuario",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-alerta-usuario",
            },
            {
              key: "adm-usuario",
              label: "Administrar usuarios",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-auth-usuario",
            },
            {
              key: "adm-centro-archivos",
              label: "Centro de archivos",
              isTitle: false,
              icon: "uil-calender",
              url: "/centro-archivos",
            },
            {
              key: "adm-gestion-tc",
              label: "Gestion de TC",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-tc",
            },
            {
              key: "adm-audit",
              label: "Auditoria",
              isTitle: false,
              icon: "uil-calender",
              url: "/auditoria",
            },
            {
              key: "conf-term",
              label: "Terminologias",
              isTitle: false,
              icon: "uil-calender",
              url: "/configuracion-terminos",
            },
            {
              key: "conf-tip-cambio",
              label: "Tipo de cambio",
              isTitle: false,
              icon: "uil-calender",
              url: "/tipo-cambio",
            },
          ],
        },
        {
          key: "entrenamiento",
          label: "Entrenamientos",
          icon: "uil-dumbbell",
          url: "/entrenamiento",
          children: [
            {
              key: "gestion-entrenamientos",
              label: "Gestión de Entrenamientos",
              isTitle: false,
              icon: "uil-dumbbell",
              url: "/gestion-entrenamientos",
            },
            {
              key: "historial-entrenamientos",
              label: "Historial de Entrenamientos",
              isTitle: false,
              icon: "uil-clock-eight",
              url: "/historial-entrenamientos",
            },
          ],
        },
      ];
    }
    if (modulo === "mod-rrhh") {
      MENU_ITEMS = [
        {
          key: "colaboradores",
          label: "COLABORADORES",
          icon: "uil-calender",
          url: "/colaborador",
          children: [
            {
              key: "colaboradores-cv",
              label: "CVS",
              isTitle: false,
              icon: "uil-calender",
              url: "/colaboradores-cv",
            },
            {
              key: "colaboradores-dni",
              label: "DNI",
              isTitle: false,
              icon: "uil-calender",
              url: "/colaboradores-dni",
            },
            {
              key: "colaboradores-admColaboradores",
              label: "Colaboradores Activos",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-empleados-activo",
            },
            {
              key: "colaboradores-admColaboradores",
              label: "Colaboradores Inactivo",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-empleados-inactivo",
            },
          ],
        },
        {
          //key: "reporte-utilidad-pgm",
          label: "GESTION DE FERIADOS",
          isTitle: false,
          icon: "uil-calender",
          url: "/gest-feriados",
        },
        {
          //key: "reporte-utilidad-pgm",
          label: "Horarios",
          isTitle: false,
          icon: "uil-calender",
          url: "/horarios-colaborador",
        },
        {
          //key: "reporte-utilidad-pgm",
          label: "Gestion de asistencia",
          isTitle: false,
          icon: "uil-calender",
          url: "/gestion-asistencia",
        },
        {
          //key: "reporte-utilidad-pgm",
          label: "Gestion de permisos",
          isTitle: false,
          icon: "uil-calender",
          url: "/gestion-permisos",
        },
        {
          //key: "reporte-utilidad-pgm",
          label: "Gestion de tardanzas",
          isTitle: false,
          icon: "uil-calender",
          url: "/gestion-tardanzas",
        },
        // {
        //   //key: "reporte-utilidad-pgm",
        //   label: "Horas extras",
        //   isTitle: false,
        //   icon: "uil-calender",
        //   url: "/gestion-asistencia",
        // },
      ];
    }
    if (modulo === "mod-general-ventas") {
      MENU_ITEMS = [
        {
          key: "cantidad-socios-montos",
          label: "Resumen general",
          icon: "uil-home-alt",
          url: "/resumen-general",
          children: [
            {
              key: "r-comparativo-mensual",
              icon: "uil-calender",
              label: "Comparativo Mensual",
              url: "/reporte/comparativo-mensual",
              parentKey: "socios-montos",
            },
            {
              key: "r-ventasAsesor",
              label: "VENTAS POR ASESOR",
              isTitle: false,
              icon: "uil-chart-line",
              url: "/reporte/ventas-asesor",
            },
            {
              key: "resumen-ejecutivo",
              label: "RESUMEN EJECUTIVO",
              isTitle: false,
              icon: "uil-calender",
              url: "/resumen-ejecutivo",
            },
            {
              key: "r-comparativo-mensual",
              icon: "uil-calender",
              label: "Comparativo Mensual Ventas",
              url: "/reporte/comparativo-mensual-ventas",
              parentKey: "socios-montos",
            },
          ],
        },
        {
          key: "asesores",
          label: "Asesores",
          icon: "uil-home-alt",
          url: "/reportes-asesores",
          children: [
            {
              key: "r-renovaciones-mes",
              icon: "uil-calender",
              label: "COMPARATIVO por ASESOR",
              url: "/reporte/ranking-por-asesor",
              parentKey: "socios-montos",
            },
            {
              key: "r-vigentes-historico",
              icon: "uil-calender",
              label: "Inscripciones por mes",
              url: "/reporte/vigentes-historico",
              parentKey: "socios-montos",
            },
            {
              key: "r-ranking-asesor-diaria",
              icon: "uil-calender",
              label: "RANKING DIARIO",
              url: "/reporte/ranking-asesor-diaria",
              parentKey: "socios-montos",
            },
            {
              key: "r-comisiones",
              label: "COMISIONES",
              isTitle: false,
              icon: "uil-money-bill",
              url: "/reporte/comisiones",
            },
          ],
        },
        {
          key: "ventas",
          label: "Ventas",
          url: "/ventas",
          icon: "uil-home-alt",
          children: [
            {
              key: "ventas-nuevaVenta",
              label: "Nueva venta",
              icon: "uil-calender",
              url: "/nueva-venta",
              parentKey: "ventas-nueva-venta",
            },
            {
              key: "ventas-reservasmf",
              label: "Reservas MonkFit",
              icon: "uil-calender",
              url: "/gestion-monkfit",
              parentKey: "ventas-reservasmf",
            },
            {
              key: "gestion-ventas",
              label: "Ventas",
              icon: "uil-calender",
              url: "/gestion-ventas",
              parentKey: "ventas-gestion-ventas",
            },
            {
              key: "gestion-ventas-transferencias",
              label: "ventas de transferencias",
              icon: "uil-calender",
              url: "/ventas-transferencias",
              parentKey: "ventas-transferencias",
            },
            {
              key: "ventas-seguimiento",
              label: "Seguimiento",
              icon: "uil-calender",
              url: "/seguimiento",
              parentKey: "ventas-seguimiento",
            },
            {
              key: "ventas-seguimiento",
              label: "reporte de seguimiento",
              icon: "uil-calender",
              url: "/reporte/reporte-seguimiento",
              parentKey: "ventas-ventas-seguimiento",
            },
            {
              key: "ventas-seguimiento",
              label: "Seguimiento por mes",
              icon: "uil-calender",
              url: "/reporte/seguimiento-x-mes",
              parentKey: "ventas-seguimiento-x-mes",
            },
          ],
        },
        {
          key: "reportes",
          label: "Reportes",
          url: "/reporte",
          icon: "uil-home-alt",
          children: [
            {
              key: "r-totalVentas",
              label: "Total de ventas",
              url: "/reporte/total-ventas",
              icon: "uil-home-alt",
              parentKey: "reportes-total",
            },
            {
              key: "r-resumenComparativo",
              label: "RESUMEN PARA MARKETING",
              url: "/reporte/resumen-comparativo",
              parentKey: "resumen-comparativo",
            },
            {
              key: "r-resumenComparativoxmes",
              label: "resumen comparativo por mes",
              url: "/reporte/comparativo-resumen-x-mes",
              parentKey: "comparativo-resumen-x-mes",
            },
            {
              key: "r-reporte-demografico",
              label: "reporte demografico",
              url: "/reporte/reporte-demografico",
              parentKey: "reporte-demografico",
            },
            {
              key: "r-reporte-demografico",
              label: "reporte demografico por membresia",
              url: "/reporte/reporte-demografico-membresia",
              parentKey: "reporte-demografico-membresia",
            },
          ],
        },
        {
          key: "cliente",
          label: "Socios",
          url: "/socio",
          icon: "uil-home-alt",
          children: [
            {
              key: "cliente-gestion-socios",
              label: "Gestion de socios",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-clientes",
            },
            {
              key: "cliente-membresia-socios",
              label: "Membresias de socios",
              isTitle: false,
              icon: "uil-calender",
              url: "/reporte-clientes-membresia",
            },
            {
              key: "cliente-contratos",
              label: "Contratos de socios",
              isTitle: false,
              icon: "uil-calender",
              url: "/contrato-clientes",
            },
            {
              key: "cliente-prospecto",
              label: "Prospectos",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-prospecto",
            },
          ],
        },
        {
          key: "cita",
          label: "Citas",
          url: "/citas",
          icon: "uil-home-alt",
          children: [
            {
              key: "citas-NUT",
              label: "Citas nutricionista",
              isTitle: false,
              icon: "uil-calender",
              url: "/crear-citas-nutricion",
            },
            {
              key: "hist-citas-NUT",
              label: "Historial de citas nutricionista",
              isTitle: false,
              icon: "uil-calender",
              url: "/history-citas-nutricion",
            },
          ],
        },
        {
          key: "cong-reg",
          label: "gestión CAMBIOS",
          icon: "uil-home-alt",
          children: [
            {
              key: "canje-gestion",
              label: "Gestion de canjes",
              isTitle: false,
              icon: "uil-calender",
              url: "/gestion-canjes",
            },
            {
              key: "canje-reporte",
              label: "REPORTE DE CANJE",
              isTitle: false,
              icon: "uil-calender",
              url: "/reporte-canje",
            },
            {
              key: "congreg",
              label: "Congelamientos y regalos",
              isTitle: false,
              icon: "uil-calender",
              url: "/extension-membresia",
            },
          ],
        },
      ];
    }
    if (modulo === "mod-marketing") {
      MENU_ITEMS = [
        {
          key: "rep-venta",
          label: "MARKETING",
          isTitle: true,
        },

        {
          key: "reportes",
          label: "Reportes",
          url: "/reporte",
          isTitle: false,
          icon: "uil-home-alt",
          children: [
            {
              key: "r-resumenComparativo",
              label: "RESUMEN PARA MARKETING",
              url: "/reporte/resumen-comparativo",
              parentKey: "resumen-comparativo",
            },
            {
              key: "r-totalVentas",
              label: "Total de ventas",
              url: "/reporte/total-ventas",
              icon: "uil-home-alt",
              parentKey: "reportes-total",
            },
            {
              key: "r-resumenComparativoxmes",
              label: "resumen comparativo por mes",
              url: "/reporte/comparativo-resumen-x-mes",
              parentKey: "comparativo-resumen-x-mes",
            },
            {
              key: "r-reporte-demografico",
              label: "reporte demografico",
              url: "/reporte/reporte-demografico",
              parentKey: "reporte-demografico",
            },
            {
              key: "r-reporte-demografico",
              label: "reporte demografico por membresia",
              url: "/reporte/reporte-demografico-membresia",
              parentKey: "reporte-demografico-membresia",
            },
          ],
        },
        {
          key: "proceso-solicitud-licencia-events",
          label: "PROCESO PARA SOLICITAR LICENCIA PARA EVENTOS",
          isTitle: false,
          icon: "uil-calender",
          url: "/proceso-solicitud-licencia-events",
        },
        {
          key: "gestion-lead",
          label: "gestion de lead",
          isTitle: false,
          icon: "uil-calender",
          url: "/gestion-lead",
        },
        {
          key: "cliente-admClientes",
          label: "FACTURACION DE PUBLICIDAD",
          isTitle: false,
          icon: "uil-calender",
          url: "/facturacion-publicidad",
        },
        {
          key: "mkt-adquisicion",
          label: "VENTAS COMPARATIVAS POR AÑO",
          isTitle: false,
          icon: "uil-calender",
          url: "/mkt-adquisicion",
        },
        {
          key: "mkt-renovacion",
          label: "RENOVACION",
          isTitle: false,
          icon: "uil-calender",
          url: "/mkt-renovacion",
        },
        {
          key: "mkt-reinscripcion",
          label: "REINSCRIPCION",
          isTitle: false,
          icon: "uil-calender",
          url: "/mkt-reinscripcion",
        },
        {
          key: "resultado-change",
          label: "RESULTADOS CHANGE",
          isTitle: false,
          icon: "uil-calender",
          url: "/resultados-change",
        },
        {
          key: "cliente-admClientes",
          label: "Membresias de socios",
          isTitle: false,
          icon: "uil-calender",
          url: "/reporte/reporte-clientes-membresia",
        },
        {
          //key: "reporte-utilidad-pgm",
          label: "PROYECTO CIRCUS",
          isTitle: false,
          icon: "uil-calender",
          url: "/gest-inventario-circus",
        },
        {
          key: "resumen-ejecutivo",
          label: "RESUMEN EJECUTIVO",
          isTitle: false,
          icon: "uil-calender",
          url: "/resumen-ejecutivo",
        },
      ];
    }
    if (modulo === "mod-inventario") {
      MENU_ITEMS = [
        {
          key: "adm-videos-infraestructura",
          label: "Videos explicativos infraestructura",
          isTitle: false,
          icon: "uil-calender",
          url: "/videos-infraestructura",
        },
        {
          //key: "reporte-utilidad-pgm",
          label: "GESTION DE INVENTARIO",
          isTitle: false,
          icon: "uil-calender",
          url: "/gest-inventario",
        },
        {
          //key: "reporte-utilidad-pgm",
          label: "ENTRADA DE ITEMS",
          isTitle: false,
          icon: "uil-calender",
          url: "/entrada-inventario",
        },
        {
          //key: "reporte-utilidad-pgm",
          label: "SALIDA DE ITEMS",
          isTitle: false,
          icon: "uil-calender",
          url: "/salida-inventario",
        },
        {
          //key: "reporte-utilidad-pgm",
          label: "TRANSFERENCIA DE ITEMS",
          isTitle: false,
          icon: "uil-calender",
          url: "/transferencia-inventario",
        },
        {
          //key: "reporte-utilidad-pgm",
          label: "INVENTARIO TOTALIZADO",
          isTitle: false,
          icon: "uil-calender",
          url: "/totalizado-inventario",
        },
        {
          label: "TERMINOLOGIAS",
          isTitle: false,
          icon: "uil-calender",
          url: "/configuracion-terminos",
        },
      ];
    }
    if (modulo === "mod-informe-gerencial") {
      MENU_ITEMS = [
        {
          //key: "reporte-utilidad-pgm",
          label: "DETALLE REINSCRIPCIONES",
          isTitle: false,
          icon: "uil-calender",
          url: "/detalle-reinscripcion-x-dia",
        },
        {
          //key: "reporte-utilidad-pgm",
          label: "SEGUIMIENTOS",
          isTitle: false,
          icon: "uil-calender",
          url: "/seguimiento",
        },
        {
          //key: "reporte-utilidad-pgm",
          label: "DETALLE RENOVACIONES",
          isTitle: false,
          icon: "uil-calender",
          url: "/detalle-renovaciones",
        },
        {
          //key: "reporte-utilidad-pgm",
          label: "DETALLE RENOVACIONES POR DIA",
          isTitle: false,
          icon: "uil-calender",
          url: "/detalle-renovaciones-x-dia",
        },
        {
          //key: "reporte-utilidad-pgm",
          label: "INFORME GERENCIAL OFICIAL",
          isTitle: false,
          icon: "uil-calender",
          url: "/informe-gerencia-oficial",
        },
      ];
    }
    res.status(200).json({
      msg: "success",
      MENU_ITEMS,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de seccionGET, hable con el administrador: ${error}`,
    });
  }
};
const moduleGET = async (req = request, res = response) => {
  try {
    const { uid } = req.params;
    const usuario = await Usuario.findOne({ where: { uid: uid } });
    // const { rol } = req.body;
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
          key: "mod-general-ventas",
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
    if (usuario.rol_user === 6) {
      MODULOS_ITEMS = [
        {
          name: "NUTRICION",
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
    res.status(200).json({
      msg: "success",
      MODULOS_ITEMS,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error en el servidor, en controller de moduleGET, hable con el administrador: ${error}`,
    });
  }
};
module.exports = {
  seccionPOST,
  moduloPOST,
  rolPOST,
  seccionGET,
  moduleGET,
  obtenermoduloxRole,
};
