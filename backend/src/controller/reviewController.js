import reviewModel from "../models/review.js";
import orderModel from "../models/order.js";

const reviewController = {};

// Las valoraciones de un producto, con el resumen que necesita la ficha: promedio, total y cuántas
// hay de cada estrella. Devuelve siempre la misma forma aunque no haya ninguna: así la pantalla
// pinta "todavía nadie opinó" en vez de romperse buscando un promedio.
reviewController.getByProduct = async (req, res) => {
  try {
    const reviews = await reviewModel
      .find({ productId: req.params.productId })
      .populate("clientId", "fullName image")
      .sort({ createdAt: -1 });

    const total = reviews.length;
    const suma = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    const promedio = total ? Number((suma / total).toFixed(1)) : 0;

    // Cuántas de 1★, 2★... para las barras del desglose.
    const reparto = [1, 2, 3, 4, 5].reduce((acc, estrella) => {
      acc[estrella] = reviews.filter((r) => r.rating === estrella).length;
      return acc;
    }, {});

    return res.status(200).json({ total, promedio, reparto, reviews });
  } catch (error) {
    // El nombre de la función se queda en el log, que es donde sirve.
    console.log("error getByProduct: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Crear o actualizar la valoración del cliente. Se exige haber comprado el producto. Es la
// diferencia entre una reseña que significa algo y un formulario que cualquiera puede llenar: sin
// esta comprobación, la competencia (o el dueño) puede escribir lo que quiera.
reviewController.upsert = async (req, res) => {
  try {
    const { productId, clientId, rating, comment } = req.body;

    if (!productId || !clientId) {
      return res.status(400).json({ message: "Falta el producto o el cliente" });
    }

    const estrellas = Number(rating);
    if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) {
      return res.status(400).json({ message: "La calificación debe ser de 1 a 5 estrellas" });
    }

    const loCompro = await orderModel.exists({
      clientId,
      "items.productId": productId,
      status: { $in: ["pagado", "preparando", "en_camino", "listo", "entregado"] },
    });

    if (!loCompro) {
      return res.status(403).json({
        message: "Solo puedes valorar productos que hayas comprado",
      });
    }

    const review = await reviewModel.findOneAndUpdate(
      { productId, clientId },
      { rating: estrellas, comment: (comment || "").trim() },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ message: "¡Gracias por tu opinión!", review });
  } catch (error) {
    console.log("error upsert review: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// El cliente borra la suya. Nadie más puede: se busca por el par producto+cliente.
reviewController.remove = async (req, res) => {
  try {
    const { clientId } = req.body;
    const borrada = await reviewModel.findOneAndDelete({
      productId: req.params.productId,
      clientId,
    });

    if (!borrada) return res.status(404).json({ message: "No tiene una valoración en este producto" });
    return res.status(200).json({ message: "Valoración eliminada" });
  } catch (error) {
    console.log("error remove review: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default reviewController;
