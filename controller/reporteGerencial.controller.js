const { request, response } = require("express");
const { Venta, detalleVenta_membresias, detalleVenta_citas, detalleVenta_pagoVenta } = require("../models/Venta");
const { Model, Sequelize } = require("sequelize");
const { Cliente } = require("../models/Usuarios");
const { Servicios } = require("../models/Servicios");
const { Impuesto, HistorialImpuesto } = require("../models/Impuesto");
const { Parametros } = require("../models/Parametros");

const utilidadesPorPrograma = async(req = request , res = response)=>{
    try {
        let ventas = await Venta.findAll({
            where:{},
            include:[
                {
                    model:Cliente,
                    where:{
                    },
                    attributes:[
                        Sequelize
                    ]
                },
                {
                    model:detalleVenta_membresias,
                    where:{
                        flag :true,
                    }
                },
            ],
        })
    } catch (error) {
        
    }
};

const getUtilidadesPorCita = async(req = request , res = response)=>{
    let response = "";
    let utilidadPoCita = {};
    try {
        let ventas = await Venta.findAll({
            where:{},
            include:[
                {
                    model:Cliente,
                    where:{
                    },
                    attributes:[
                        [
                        Sequelize.fn(
                            "CONCAT",
                            Sequelize.col("nombre_cli"),
                            " ",
                            Sequelize.col("apPaterno_cli"),
                            "",
                            Sequelize.col("apMaterno_cli"),

                        ),
                        "nombres_apellidos_cli",
                        ],
                    ]
                },
                {
                    model:detalleVenta_citas,
                    required:true,
                    where:{
                        flag :true,
                    },
                    include:[
                        {
                            model:Servicios,
                            where:{
                                flag:true,
                            },
                        },
                    ],
                },
                {
                    model:detalleVenta_pagoVenta,
                    attributes: ["id_forma_pago"],
                    where:{
                        //flag:true,
                    },
                    include:[
                        {
                            model:Parametros,
                            as:"parametro_forma_pago",
                            where:{
                                //flag:true,
                            },
                        },
                    ],
                }
            ],
        })
        let impuestos = await GetHistorialImpuesto();
        console.log(impuestos[1].tb_historial_impuestos);
        ventas.map(venta=>{
            venta.detalle_ventaCitas.map(detalleVenta =>{
                let fechaVentaDate = new Date(venta.fecha_venta);

                //console.log(venta.detalleVenta_pagoVenta[0].parametro_forma_pago);

                const impuesto = impuestos[1].tb_historial_impuestos.find((historial) => (((fechaVentaDate >= new Date(historial.fec_inicio) && fechaVentaDate <= new Date(historial.fec_fin))) ||  historial.fec_fin == "indefinido" ))
                //const formaPago = venta.detalleVenta_pagoVenta[0].parametro_forma_pago.find((formaPago)=> (formaPago.label_param == "DOLARES"));
                const formaPago = venta.detalleVenta_pagoVenta[0].parametro_forma_pago == "DOLARES" ? venta.detalleVenta_pagoVenta[0].parametro_forma_pago : null;


                if (detalleVenta.tb_servicio) {
                    if (!utilidadPoCita[detalleVenta.tb_servicio.id]) {
                        utilidadPoCita[detalleVenta.tb_servicio.id] = {
                            //id:"",
                            tipo_servicio:"",
                            nombre_servicio:"",
                            ingresoSoles:0,
                            egresoSoles:0,
                            ingresoDolares:0,
                            egresoDolares:0,
                            impuestos : [],
                            fechasVenta : [],
                        };
                    };
                    utilidadPoCita[detalleVenta.tb_servicio.id].tipo_servicio = detalleVenta?.tb_servicio?.tipo_servicio ;
                    utilidadPoCita[detalleVenta.tb_servicio.id].nombre_servicio = detalleVenta?.tb_servicio?.nombre_servicio ;
                    utilidadPoCita[detalleVenta.tb_servicio.id].ingresoSoles += detalleVenta?.tarifa_monto;
                    utilidadPoCita[detalleVenta.tb_servicio.id].egresoSoles += (detalleVenta?.tarifa_monto* impuesto?.multiplicador) || 0;

                    if (formaPago) {
                        utilidadPoCita[detalleVenta.tb_servicio.id].ingresoDolares += detalleVenta?.tarifa_monto;
                        utilidadPoCita[detalleVenta.tb_servicio.id].egresoDolares += (detalleVenta?.tarifa_monto* impuesto?.multiplicador) || 0;
                    };

                    utilidadPoCita[detalleVenta.tb_servicio.id].fechasVenta.push(venta.fecha_venta);
                    utilidadPoCita[detalleVenta.tb_servicio.id].impuestos.push(impuesto||null);
                }else{
                    //console.log(venta.id);

                };
      

            });
        });
        response= {
            ok:true,
            response : utilidadPoCita
        };
    } catch (error) {
        console.log(error);
        response = {
            ok:false,
            message : error.message
        };
    }
    if(response.ok){

        res.status(200).json({
            response
        });
    
    }else{

        res.status(500).json({
            response
        });
    
    }

}


async function GetHistorialImpuesto() {
    const impuestos = await Impuesto.findAll({
        where: { flag: true },
        attributes: ["id", "name_impuesto"],
        include: [
          {
            model: HistorialImpuesto,
            attributes: [
              "multiplicador",
              "id_impuesto",
              "id",
              "fec_inicio",
              "fec_fin",
            ],
          },
        ],
      });
      let respuesta  = impuestos.map((impuesto) => impuesto.get({plain:true}));
    return respuesta;
}

module.exports = {
    getUtilidadesPorCita
}