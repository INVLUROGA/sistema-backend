const { Articulos } = require("../models/Articulo");
const { MovimientoArticulo } = require("../models/MovimientoArticulo");

const updateArticuloxIDxMovimientos = async (idArticulo) => {
  try {
    const movimientoArticulo = await MovimientoArticulo.findAll({
      where: { id_articulo: idArticulo, flag: true },
      order: [["id", "desc"]],
      raw: true,
    });
    const entradasDeArticulo = movimientoArticulo?.filter(
      (e) => e.movimiento === "entrada"
    );
    const salidaDeArticulo = movimientoArticulo.filter(
      (e) => e.movimiento === "salida"
    );
    const TraspasoDeArticulo = movimientoArticulo.filter(
      (e) => e.movimiento === "traspaso"
    );
    const ultimoTraspaso = {
      lugar_destino: TraspasoDeArticulo[0].id_lugar_destino,
      id_empresa: TraspasoDeArticulo[0].id_empresa,
    };
    const sumaCantidadesEntrada = entradasDeArticulo?.reduce(
      (total, item) => total + (item?.cantidad || 0),
      0
    );
    const sumaCantidadesSalida = salidaDeArticulo?.reduce(
      (total, item) => total + (item?.cantidad || 0),
      0
    );
    const articulo = await Articulos.findOne({
      where: {
        id: idArticulo,
      },
    });
    await articulo.update({
      cantidad: sumaCantidadesEntrada - sumaCantidadesSalida,
      id_lugar: ultimoTraspaso.lugar_destino,
      id_empresa: ultimoTraspaso.id_empresa,
    });
    console.log({ idArticulo, ok: true });

    return {
      ok: true,
    };
  } catch (error) {
    console.log({ error });
  }
};
module.exports = {
  updateArticuloxIDxMovimientos,
};
