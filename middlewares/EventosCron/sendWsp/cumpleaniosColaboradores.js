const { Empleado } = require("../../../models/Usuarios");

const cumpleaniosColaboradores = async()=>{
    try {
        const fechaHoy = new Date()
        const diaHoy = fechaHoy.getDate()
        const mesHoy = fechaHoy.getMonth() + 1
        const anioHoy = fechaHoy.getFullYear()

        const empleados = await Empleado.findAll({
            where: { flag: true, id_empresa: 598, estado_empl: true },
            raw: true,
        })

        empleados
            .filter((e) => e.fecha_nacimiento)
            .forEach(async (e) => {
                const fechaNac = new Date(e.fecha_nacimiento)
                if (fechaNac.getDate() !== diaHoy || fechaNac.getMonth() + 1 !== mesHoy) return
                const nombres_apellidos = `${e.nombre_empl} ${e.apPaterno_empl} ${e.apMaterno_empl}`
                const n_anios_cumplidos = anioHoy - fechaNac.getFullYear()
                const idsUsers = [35, 31, 30, 8, 22];
                await enviarWspUsuario(
                `${nombres_apellidos} ${n_anios_cumplidos}`,
                new Date().setMinutes(new Date().getMinutes() + 1),
                idsUsers,
                );
                console.log(`${nombres_apellidos} ${n_anios_cumplidos}`)
            })
    } catch (error) {
        console.log('Error en cumpleaniosColaboradores', error)
    }
}

module.exports = {
    cumpleaniosColaboradores
}
