const obtenerUsuariosxCodigo = async (codigo) => {
  const usuariosQrecibenAlerta = await AlertasUsuario.findAll({
    where: { mensaje: codigo, flag: true },
  });
  return usuariosQrecibenAlerta;
};
module.exports={
    obtenerUsuariosxCodigo
}