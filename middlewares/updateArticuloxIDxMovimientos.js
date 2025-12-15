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
    const ultimoTraspaso = TraspasoDeArticulo[0].id_lugar_destino;
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
      id_lugar_destino: ultimoTraspaso,
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
