const { response, request } = require("express");
const {
  SeccionItem,
  ModulosVSseccion,
  rolesvsModulos,
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
const seccionGET = async (req = request, res = response) => {
  const { modulo } = req.params;
  try {
    let MENU_ITEMS = [];
    if (modulo === "mod-nutricion") {
      MENU_ITEMS = [
        {
          key: "cita",
          label: "Citas",
          isTitle: true,
        },
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
        {
          key: "cliente",
          label: "SOCIO",
          isTitle: true,
        },
        {
          key: "cliente-admClientes",
          label: "Gestion de socios",
          isTitle: false,
          icon: "uil-calender",
          url: "/gestion-clientes",
        },
      ];
    }
    if (modulo === "mod-venta") {
      MENU_ITEMS = [
        {
          key: "ventas",
          label: "Ventas",
          isTitle: true,
        },
        {
          key: "ventas-nuevaVenta",
          label: "Nueva venta",
          isTitle: false,
          icon: "uil-calender",
          url: "/nueva-venta",
        },
        {
          key: "ventas-seguimiento",
          label: "Seguimiento",
          isTitle: false,
          icon: "uil-calender",
          url: "/seguimiento",
        },
        {
          key: "cliente",
          label: "SOCIO",
          isTitle: true,
        },
        {
          key: "cliente-contratos",
          label: "Contratos de socios",
          isTitle: false,
          icon: "uil-calender",
          url: "/contrato-clientes",
        },
        {
          key: "cliente-admClientes",
          label: "Gestion de socios",
          isTitle: false,
          icon: "uil-calender",
          url: "/gestion-clientes",
        },
        {
          key: "cliente-prospecto",
          label: "Prospectos",
          isTitle: false,
          icon: "uil-calender",
          url: "/gestion-prospecto",
        },
        {
          key: "cita",
          label: "Citas",
          isTitle: true,
        },
        {
          key: "citas-nutricional",
          label: "Citas nutricionista",
          isTitle: false,
          icon: "uil-calender",
          url: "/crear-citas-nutricion",
        },
        {
          key: "citas-fitology",
          label: "Citas Tratamientos esteticos",
          isTitle: false,
          icon: "uil-calender",
          url: "/crear-citas-fitology",
        },
        {
          key: "cong-reg",
          label: "Congelamiento y Regalo",
          isTitle: true,
        },
        {
          key: "congreg",
          label: "Congelamiento y regalos",
          isTitle: false,
          icon: "uil-calender",
          url: "/extension-membresia",
        },
      ];
    }
    if (modulo === "mod-adm") {
      MENU_ITEMS = [
        {
          key: "reporte-admin",
          label: "Reporte de Utilidad",
          isTitle: true,
        },
        {
          key: "reporte-utilidad-pgm",
          label: "Por programas",
          isTitle: false,
          icon: "uil-calender",
          url: "/reporte-admin/reporte-utilidad-programa",
        },
        {
          key: "reporte-utilidad-sup",
          label: "Por suplementos",
          isTitle: false,
          icon: "uil-calender",
          url: "/reporte-admin/reporte-utilidad-supl",
        },
        {
          key: "reporte-utilidad-acc",
          label: "Por accesorios",
          isTitle: false,
          icon: "uil-calender",
          url: "/reporte-admin/reporte-utilidad-acc",
        },
        {
          key: "reporte-utilidad-trat-estetico",
          label: "Por tratamientos esteticos",
          isTitle: false,
          icon: "uil-calender",
          url: "/reporte-admin/reporte-utilidad-trat-estetico",
        },
        {
          key: "reporte-utilidad-nutricion",
          label: "Por nutricionista",
          isTitle: false,
          icon: "uil-calender",
          url: "/reporte-admin/reporte-utilidad-nutricionista",
        },
        {
          key: "config",
          label: "Recursos Humanos",
          isTitle: true,
        },
        {
          //key: "reporte-utilidad-pgm",
          label: "Reportes Por Planilla",
          isTitle: false,
          icon: "uil-calender",
          url: "/reporte-admin/RecursosHumanoReportes",
        },
        {
          key: "reporte-utilidad-pgm",
          label: "Reporte de asistencias",
          isTitle: false,
          icon: "uil-calender",
          url: "/reporte-admin/asistenciaReporte",
        },
        {
          key: "config",
          label: "INVENTARIO",
          isTitle: true,
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
          label: "INVENTARIO TOTALIZADO",
          isTitle: false,
          icon: "uil-calender",
          url: "/totalizado-inventario",
        },
        {
          key: "reporte-admin",
          label: "Reportes",
          isTitle: true,
        },
        {
          key: "reporte-utilidad-pgm",
          label: "Planilla",
          isTitle: false,
          icon: "uil-calender",
          url: "/reporte-admin/RecursosHumanoReportes",
        },
        {
          key: "reporte-flujo-caja",
          label: "FLUJO DE CAJA",
          isTitle: false,
          icon: "uil-calender",
          url: "/reporte-admin/flujo-caja",
        },
        {
          key: "reporte-comparativa-dia",
          label: "Comparativo por dia",
          isTitle: false,
          icon: "uil-calender",
          url: "/reporte-admin/comparativa-dia",
        },
        {
          key: "reporte-egresos",
          label: "Egresos",
          isTitle: false,
          icon: "uil-calender",
          url: "/reporte-admin/reporte-egresos",
        },
        {
          key: "reporte-gerencial",
          label: "Gerencial",
          isTitle: false,
          icon: "uil-calender",
          url: "/reporte-admin/reporte-gerencial",
        },
        {
          key: "reporte-gerencial",
          label: "Reporte de Clientes",
          isTitle: false,
          icon: "uil-calender",
          url: "/reporte-admin/ReportePorMarcacion",
        },
        {
          key: "gf-gv",
          label: "Egresos y Aportes",
          isTitle: true,
        },
        {
          key: "gestion-gfgv",
          label: "Registro de compra",
          isTitle: false,
          icon: "uil-calender",
          url: "/orden-compra",
        },
        {
          key: "gestion-gfgv",
          label: "Egresos",
          isTitle: false,
          icon: "uil-calender",
          url: "/gestion-gastosF-gastosV",
        },
        {
          key: "gestion-gfgv",
          label: "Aportes",
          isTitle: false,
          icon: "uil-calender",
          url: "/aporte-ingresos",
        },
        {
          key: "prov",
          label: "Proveedores",
          isTitle: true,
        },
        {
          key: "gest-prov",
          label: "Gestion de proveedores",
          isTitle: false,
          icon: "uil-calender",
          url: "/gestion-proveedores",
        },
        {
          key: "trab-prov",
          label: "gastos ",
          isTitle: false,
          icon: "uil-calender",
          url: "/proveedores/prov-agentes",
        },
        {
          key: "planilla",
          label: "Planilla",
          isTitle: true,
        },
        {
          key: "colaboradores-admColaboradores",
          label: "Colaboradores",
          isTitle: false,
          icon: "uil-calender",
          url: "/gestion-empleados",
        },
        {
          key: "gest-serv",
          label: "Gestion de servicios",
          isTitle: true,
        },
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
          key: "serv-fito",
          label: "Fitology",
          isTitle: false,
          icon: "uil-calender",
          url: "/serv-fitology",
        },
        {
          key: "serv-nutri",
          label: "Nutricion",
          isTitle: false,
          icon: "uil-calender",
          url: "/serv-nutricion",
        },
        {
          key: "planilla",
          label: "Otros",
          isTitle: true,
        },
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
        {
          key: "config",
          label: "Configuracion",
          isTitle: true,
        },
        {
          key: "adm-usuario",
          label: "Administrar usuarios",
          isTitle: false,
          icon: "uil-calender",
          url: "/gestion-auth-usuario",
        },
        {
          key: "gest-jornada",
          label: "Gestion de jornadas",
          isTitle: false,
          icon: "uil-calender",
          url: "/gest-jornada",
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
        // {
        //   key: "menu-levels",
        //   label: "Multi Levels",
        //   isTitle: false,
        //   icon: "uil-folder-plus",
        //   children: [
        //     {
        //       key: "menu-levels-1-1",
        //       label: "Level 1.1",
        //       url: "/",
        //       parentKey: "menu-levels",
        //     },
        //     {
        //       key: "menu-levels-1-2",
        //       label: "Level 1.2",
        //       url: "/",
        //       parentKey: "menu-levels",
        //     },
        //   ],
        // },
      ];
    }
    if (modulo === "mod-general-ventas") {
      MENU_ITEMS = [
        {
          key: "ventas",
          label: "Ventas",
          isTitle: true,
        },
        {
          key: "ventas-nuevaVenta",
          label: "Nueva venta",
          isTitle: false,
          icon: "uil-calender",
          url: "/nueva-venta",
        },
        {
          key: "gestion-ventas",
          label: "Ventas",
          isTitle: false,
          icon: "uil-calender",
          url: "/gestion-ventas",
        },
        {
          key: "gestion-ventas",
          label: "ventas de transferencias",
          isTitle: false,
          icon: "uil-calender",
          url: "/ventas-transferencias",
        },
        {
          key: "ventas-seguimiento",
          label: "Seguimiento",
          isTitle: false,
          icon: "uil-calender",
          url: "/seguimiento",
        },
        {
          key: "gest-cambio-programa",
          label: "Gestion de cambio de programa",
          isTitle: false,
          icon: "uil-calender",
          url: "/gestion-cambio-programa",
        },
        {
          key: "ventas-seguimiento",
          label: "reporte de seguimiento",
          isTitle: false,
          icon: "uil-calender",
          url: "/reporte/reporte-seguimiento",
        },
        {
          key: "ventas-seguimiento",
          label: "Seguimiento por mes",
          isTitle: false,
          icon: "uil-calender",
          url: "/reporte/seguimiento-x-mes",
        },
        {
          key: "reportes",
          label: "Reportes",
          url: "/reporte",
          isTitle: false,
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
              key: "r-ventasPrograma",
              label: "Ventas por programas",
              url: "/reporte/reporte-programa",
              parentKey: "reporte-programa",
            },
            {
              key: "r-ventasPrograma",
              label: "Ventas por metas",
              url: "/reporte/reporte-metas",
              parentKey: "reporte-meta",
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
          key: "gest-comercial",
          label: "Gestion comercial",
          isTitle: true,
        },
        {
          key: "reg-gest-comercial",
          label: "GESTION COMERCIAL",
          isTitle: false,
          icon: "uil-calender",
          url: "/gestion-comercial",
        },
        {
          key: "reporte-gest-comercial",
          label: "REPORTE de GESTION COMERCIAL",
          isTitle: false,
          icon: "uil-calender",
          url: "/reporte/gestion-comercial",
        },
        {
          key: "cliente",
          label: "Socio",
          isTitle: true,
        },
        {
          key: "cliente-admClientes",
          label: "Gestion de socios",
          isTitle: false,
          icon: "uil-calender",
          url: "/gestion-clientes",
        },
        {
          key: "cliente-admClientes",
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
        {
          key: "cita",
          label: "Citas",
          isTitle: true,
        },
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
        {
          key: "citas-FIT",
          label: "tratamientos esteticos",
          isTitle: false,
          icon: "uil-calender",
          url: "/crear-citas-fitology",
        },
        {
          key: "cong-reg",
          label: "Congelamiento y Regalo",
          isTitle: true,
        },
        {
          key: "congreg",
          label: "Congelamiento y regalos",
          isTitle: false,
          icon: "uil-calender",
          url: "/extension-membresia",
        },
        {
          key: "Metas",
          label: "Metas y bonos",
          isTitle: true,
        },
        {
          key: "meta",
          label: "Metas y bonos",
          isTitle: false,
          icon: "uil-calender",
          url: "/metas",
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
              key: "r-ventasPrograma",
              label: "Ventas por programas",
              url: "/reporte/reporte-programa",
              parentKey: "reporte-programa",
            },
            {
              key: "r-ventasPrograma",
              label: "Ventas por metas",
              url: "/reporte/reporte-metas",
              parentKey: "reporte-meta",
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
          key: "cliente-admClientes",
          label: "FACTURACION DE PUBLICIDAD",
          isTitle: false,
          icon: "uil-calender",
          url: "/facturacion-publicidad",
        },
        {
          key: "cliente-admClientes",
          label: "Membresias de socios",
          isTitle: false,
          icon: "uil-calender",
          url: "/reporte/reporte-clientes-membresia",
        },
        // {
        //   key: "mkt-ar",
        //   label: "Actas de reunion",
        //   isTitle: false,
        //   icon: "pi pi-address-book",
        //   url: "/mkt-actas-reunion",
        // },
        // {
        //   key: "mkt-fb",
        //   label: "Facebook",
        //   isTitle: false,
        //   icon: "pi pi-facebook",
        //   url: "/trabajo-marketing",
        // },
        // {
        //   key: "mkt-ig",
        //   label: "Instagram",
        //   isTitle: false,
        //   icon: "pi pi-instagram",
        //   url: "/trabajo-marketing",
        // },
        // {
        //   key: "mkt-videos",
        //   label: "Tik tok",
        //   isTitle: false,
        //   icon: "pi pi-tiktok",
        //   url: "/trabajo-marketing",
        // },
        // {
        //   key: "mkt-doc",
        //   label: "Videos",
        //   isTitle: false,
        //   icon: "pi pi-video",
        //   url: "/trabajo-marketing",
        // },
        // {
        //   key: "mkt-disenio",
        //   label: "Fotos",
        //   isTitle: false,
        //   icon: "uil-scenery",
        //   url: "/trabajo-marketing",
        // },
        // {
        //   key: "mkt-contratos",
        //   label: "Diseños",
        //   isTitle: false,
        //   icon: "uil-calender",
        //   url: "/trabajo-marketing",
        // },
        // {
        //   key: "mkt-fotos",
        //   label: "Documentos",
        //   isTitle: false,
        //   icon: "pi pi-file",
        //   url: "/trabajo-marketing",
        // },
      ];
    }
    if (modulo === "mod-inventario") {
      MENU_ITEMS = [
        {
          key: "gest-invent",
          label: "Gestion de inventario",
          isTitle: false,
          icon: "pi pi-address-book",
          url: "/gest-inventario",
        },
        {
          key: "gest-prov",
          label: "Gestion de proveedores",
          isTitle: false,
          icon: "uil-calender",
          url: "/gestion-proveedores",
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
};
