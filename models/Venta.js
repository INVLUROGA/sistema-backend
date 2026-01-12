const { DataTypes } = require("sequelize");
const uuid = require("uuid");
const { db } = require("../database/sequelizeConnection");
const { Cliente, Empleado } = require("./Usuarios");
// IMPORTAMOS PRODUCTO AQUÍ
const { Producto } = require("./Producto");

const {
  ProgramaTraining,
  SemanasTraining,
  TarifaTraining,
} = require("./ProgramaTraining");
const { Parametros } = require("./Parametros");
const { ImagePT } = require("./Image");
const { HorarioProgramaPT } = require("./HorarioProgramaPT");
const { ServiciosCircus } = require("./modelsCircus/Servicios");

const cajasMovimientos = db.define("tb_cajas_movimiento", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  fecha_apertura: {
    type: DataTypes.DATE,
    defaultValue: new Date(),
  },
  fecha_cierre: {
    type: DataTypes.DATE,
    defaultValue: new Date(),
  },
  flag: {
    type: DataTypes.INTEGER,
    defaultValue: true,
  },
});

const Venta = db.define("tb_venta", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_caja: {
    type: DataTypes.INTEGER,
  },
  id_cli: {
    type: DataTypes.INTEGER,
  },
  id_empl: {
    type: DataTypes.INTEGER,
  },
  id_tipoFactura: {
    type: DataTypes.INTEGER,
  },
  numero_transac: {
    type: DataTypes.STRING,
  },
  observacion: {
    type: DataTypes.STRING(360),
  },
  id_origen: {
    type: DataTypes.INTEGER,
  },
  id_empresa: {
    type: DataTypes.INTEGER,
  },
  status_remove: {
    type: DataTypes.INTEGER,
  },
  fecha_venta: {
    type: DataTypes.DATE,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const detalleVenta_membresias = db.define("detalle_ventaMembresia", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_membresia_anterior: {
    type: DataTypes.INTEGER,
  },
  id_venta: {
    type: DataTypes.INTEGER,
  },
  fec_inicio_mem: {
    type: DataTypes.STRING(12),
  },
  fec_fin_mem: {
    type: DataTypes.STRING(12),
  },
  fec_fin_mem_oftime: {
    type: DataTypes.DATE,
  },
  id_pgm: {
    type: DataTypes.INTEGER,
  },
  id_tarifa: {
    type: DataTypes.INTEGER,
  },
  id_st: {
    type: DataTypes.INTEGER,
  },
  uid_firma: {
    type: DataTypes.STRING(255),
  },
  uid_contrato: {
    type: DataTypes.STRING(255),
  },
  horario: {
    type: DataTypes.TIME,
  },
  id_horario: {
    type: DataTypes.INTEGER,
  },
  tarifa_monto: {
    type: DataTypes.DECIMAL(10, 2),
  },
  fecha_inicio: {
    type: DataTypes.DATE,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const detalleVenta_Transferencia = db.define("detalle_ventaTransferencia", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_venta: {
    type: DataTypes.INTEGER,
  },
  id_membresia: {
    type: DataTypes.INTEGER,
  },
  tarifa_monto: {
    type: DataTypes.DECIMAL(10, 2),
  },
  uid_firma: {
    type: DataTypes.STRING(255),
  },
  uid_contrato: {
    type: DataTypes.STRING(255),
  },
  horario: {
    type: DataTypes.TIME,
  },
  fec_inicio_mem: {
    type: DataTypes.STRING(12),
  },
  fec_fin_mem: {
    type: DataTypes.STRING(12),
  },
  fecha_inicio: {
    type: DataTypes.DATE,
  },
  fecha_fin: {
    type: DataTypes.DATE,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const detalleVenta_producto = db.define("detalle_ventaProducto", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_venta: {
    type: DataTypes.INTEGER,
  },
  id_producto: {
    type: DataTypes.INTEGER,
  },
  cantidad: {
    type: DataTypes.INTEGER,
  },
  precio_unitario: {
    type: DataTypes.DECIMAL(10, 2),
  },
  tarifa_monto: {
    type: DataTypes.DECIMAL(10, 2),
  },
  id_empl: {
    type: DataTypes.INTEGER,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const detalleVenta_citas = db.define("detalle_ventaCitas", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_venta: {
    type: DataTypes.INTEGER,
  },
  id_servicio: {
    type: DataTypes.INTEGER,
  },
  cantidad: {
    type: DataTypes.STRING,
  },
  tarifa_monto: {
    type: DataTypes.DECIMAL(10, 2),
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const detalleVenta_pagoVenta = db.define("detalleVenta_pagoVenta", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_venta: {
    type: DataTypes.INTEGER,
  },
  id_forma_pago: {
    type: DataTypes.INTEGER,
  },
  fecha_pago: {
    type: DataTypes.DATE,
  },
  id_banco: {
    type: DataTypes.INTEGER,
  },
  id_tipo_tarjeta: {
    type: DataTypes.INTEGER,
  },
  id_tarjeta: {
    type: DataTypes.INTEGER,
  },
  n_operacion: {
    type: DataTypes.STRING(50),
  },
  observacion: {
    type: DataTypes.STRING(360),
  },
  parcial_monto: {
    type: DataTypes.DECIMAL(10, 2),
  },
});

const detalle_cambioPrograma = db.define("detalle_cambioPrograma", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  fecha_cambio: {
    type: DataTypes.DATE,
  },
  id_venta: {
    type: DataTypes.INTEGER,
  },
  id_pgm: {
    type: DataTypes.INTEGER,
  },
  id_horario: {
    type: DataTypes.INTEGER,
  },
  id_motivo: {
    type: DataTypes.INTEGER,
  },
  observacion: {
    type: DataTypes.STRING(360),
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const detalleventa_servicios = db.define("detalle_ventaservicios", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_venta: {
    type: DataTypes.INTEGER,
  },
  id_empl: {
    type: DataTypes.INTEGER,
  },
  id_servicio: {
    type: DataTypes.INTEGER,
  },
  cantidad: {
    type: DataTypes.INTEGER,
  },
  tarifa_monto: {
    type: DataTypes.DECIMAL(10, 2),
  },
  observacion: {
    type: DataTypes.STRING(360),
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const leadsxDia = db.define("tb_leadsDia", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  fecha: {
    type: DataTypes.DATE,
  },
  cantidad: {
    type: DataTypes.CHAR(5),
  },
  monto: {
    type: DataTypes.DECIMAL(10, 2),
  },
  id_empresa: {
    type: DataTypes.INTEGER,
  },
  id_red: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  flag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

// ASOCIACIONES

detalleVenta_membresias.hasOne(HorarioProgramaPT, {
  foreignKey: "id_HorarioPgm",
  sourceKey: "id_horario",
  as: "horario_pgm",
});
detalleVenta_membresias.hasOne(TarifaTraining, {
  foreignKey: "id_tt",
  sourceKey: "id_tarifa",
  as: "tarifa_venta",
});

detalleVenta_pagoVenta.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_forma_pago",
  as: "parametro_forma_pago",
});
detalleVenta_pagoVenta.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_banco",
  as: "parametro_banco",
});
detalleVenta_pagoVenta.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_tipo_tarjeta",
  as: "parametro_tipo_tarjeta",
});
detalleVenta_pagoVenta.hasOne(Parametros, {
  foreignKey: "id_param",
  sourceKey: "id_tarjeta",
  as: "parametro_tarjeta",
});

detalleVenta_membresias.hasOne(ProgramaTraining, {
  foreignKey: "id_pgm",
  sourceKey: "id_pgm",
});
ProgramaTraining.belongsTo(detalleVenta_membresias, {
  foreignKey: "id_pgm",
  targetKey: "id_pgm",
});

detalleVenta_membresias.hasOne(SemanasTraining, {
  foreignKey: "id_st",
  sourceKey: "id_st",
});
SemanasTraining.belongsTo(detalleVenta_membresias, {
  foreignKey: "id_st",
  targetKey: "id_st",
});

detalleVenta_membresias.hasMany(detalle_cambioPrograma, {
  foreignKey: "id_venta",
  sourceKey: "id_venta",
  as: "cambio_programa",
});

detalle_cambioPrograma.hasOne(ProgramaTraining, {
  foreignKey: "id_pgm",
  sourceKey: "id_pgm",
});

detalleVenta_membresias.hasOne(ImagePT, {
  foreignKey: "uid_location",
  sourceKey: "uid_contrato",
  as: "contrato_x_serv",
});

detalleVenta_membresias.hasOne(ImagePT, {
  foreignKey: "uid_location",
  sourceKey: "uid_firma",
  as: "firma_cli",
});

// Relación Venta - Cliente
Venta.belongsTo(Cliente, {
  foreignKey: "id_cli",
  sourceKey: "id",
});
Cliente.hasMany(Venta, {
  foreignKey: "id_cli",
  targetKey: "id",
});

// Relación Venta - Empleado
Venta.belongsTo(Empleado, {
  foreignKey: "id_empl",
  sourceKey: "id",
});
Empleado.hasMany(Venta, {
  foreignKey: "id_empl",
  targetKey: "id",
});

// Relación Venta - Detalle Producto
Venta.hasMany(detalleVenta_producto, {
  foreignKey: "id_venta",
  sourceKey: "id",
});
detalleVenta_producto.belongsTo(Venta, {
  foreignKey: "id_venta",
  targetKey: "id",
});

// Relación Venta - Detalle Servicios
Venta.hasMany(detalleventa_servicios, {
  foreignKey: "id_venta",
  sourceKey: "id",
});
detalleventa_servicios.belongsTo(Venta, {
  foreignKey: "id_venta",
  targetKey: "id",
});

// Detalle Servicios - Servicios Circus
detalleventa_servicios.hasOne(ServiciosCircus, {
  foreignKey: "id",
  sourceKey: "id_servicio",
});
ServiciosCircus.belongsTo(detalleventa_servicios, {
  foreignKey: "id",
  targetKey: "id_servicio",
});

// Detalle Servicios - Empleado
detalleventa_servicios.belongsTo(Empleado, {
  foreignKey: "id_empl",
  as: "empleado_servicio",
});
Empleado.hasMany(detalleventa_servicios, {
  foreignKey: "id_empl",
  as: "servicios_realizados",
});

// --- ASOCIACIONES CORREGIDAS PARA PRODUCTOS ---

// 1. Detalle Venta Producto pertenece a un Empleado
detalleVenta_producto.belongsTo(Empleado, {
  foreignKey: "id_empl",
  as: "empleado_producto",
});
Empleado.hasMany(detalleVenta_producto, {
  foreignKey: "id_empl",
  as: "productos_realizados",
});

// 2. Detalle Venta Producto pertenece a un Producto (ESTA FALTABA EN VENTA.JS)
// Esta relación usa el id_producto que está en detalle_ventaProducto
detalleVenta_producto.belongsTo(Producto, {
  foreignKey: "id_producto",
  targetKey: "id",
});
Producto.hasMany(detalleVenta_producto, {
  foreignKey: "id_producto",
  sourceKey: "id",
});

// ----------------------------------------------

// Relación Venta - Detalle Membresías
Venta.hasMany(detalleVenta_membresias, {
  foreignKey: "id_venta",
  sourceKey: "id",
});
detalleVenta_membresias.belongsTo(Venta, {
  foreignKey: "id_venta",
  targetKey: "id",
});

// Relación Venta - Detalle Transferencia
Venta.hasMany(detalleVenta_Transferencia, {
  foreignKey: "id_venta",
  sourceKey: "id",
  as: "venta_venta",
});
detalleVenta_Transferencia.belongsTo(Venta, {
  foreignKey: "id_venta",
  targetKey: "id",
  as: "venta_venta",
});
detalleVenta_Transferencia.hasMany(Venta, {
  foreignKey: "id",
  sourceKey: "id_membresia",
  as: "venta_transferencia",
});
Venta.belongsTo(detalleVenta_Transferencia, {
  foreignKey: "id",
  targetKey: "id_membresia",
  as: "venta_transferencia",
});

// Relación Venta - Detalle Citas
Venta.hasMany(detalleVenta_citas, {
  foreignKey: "id_venta",
  sourceKey: "id",
});
detalleVenta_citas.belongsTo(Venta, {
  foreignKey: "id_venta",
  targetKey: "id",
});

// Relación Venta - Pagos
Venta.hasMany(detalleVenta_pagoVenta, {
  foreignKey: "id_venta",
  sourceKey: "id",
});
detalleVenta_pagoVenta.belongsTo(Venta, {
  foreignKey: "id_venta",
  targetKey: "id",
});

// Syncs (Opcional si ya usas migrations o sync global)
/*
leadsxDia.sync();
detalleventa_servicios.sync();
detalle_cambioPrograma.sync();
detalleVenta_Transferencia.sync();
cajasMovimientos.sync();
Venta.sync();
detalleVenta_membresias.sync();
detalleVenta_pagoVenta.sync();
detalleVenta_citas.sync();
detalleVenta_producto.sync();
*/

module.exports = {
  Venta,
  detalleVenta_membresias,
  detalleVenta_Transferencia,
  detalleVenta_pagoVenta,
  detalleVenta_citas,
  detalleVenta_producto,
  detalle_cambioPrograma,
  detalleventa_servicios,
  cajasMovimientos,
  leadsxDia,
};
