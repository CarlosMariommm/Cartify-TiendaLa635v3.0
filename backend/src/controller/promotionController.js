import promotionModel from "../models/promotion.js";
import { v2 as cloudinary } from "cloudinary";
import { avisarPromoNuevaEnSegundoPlano } from "../utils/avisoPromo.js";
import { CAMPOS_PUBLICOS_PRODUCTO } from "../utils/productoPublico.js";

const promotionController = {};

// items llega como JSON string (FormData): [{ productId, discount, fixedPrice }]
const parseItems = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
};

const parseActivo = (v) => !(v === 'false' || v === false);

// La fecha llega como "2026-08-03" desde un <input type="date">. Se guarda al FINAL de ese día: si
// el gerente escribe "vence el 3", la promo tiene que servir todo el 3 y no apagarse a la
// medianoche en que empieza.
const parseVencimiento = (valor) => {
  if (!valor || valor === 'null' || valor === 'undefined') return null;
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(valor);
  const fecha = new Date(soloFecha ? `${valor}T23:59:59.999` : valor);
  return isNaN(fecha.getTime()) ? null : fecha;
};

// Apaga las promociones que ya vencieron.
const desactivarVencidas = async () => {
  try {
    await promotionModel.updateMany(
      { isActive: true, endsAt: { $type: "date", $lt: new Date() } },
      { $set: { isActive: false } }
    );
  } catch (error) {
    // Que no se caiga la lista por esto: peor es no devolver las promos.
    console.log("no se pudieron desactivar las promos vencidas: " + error);
  }
};

promotionController.getPromotions = async (req, res) => {
  try {
    await desactivarVencidas();
    // Esta lista es pública (la pide la portada), así que el producto de cada promo va con lo que ve
    // un cliente. Poblado entero dejaba ver el costo de todo lo que estuviera en oferta. Ver
    // utils/productoPublico.js.
    const promotions = await promotionModel.find().populate("items.productId", CAMPOS_PUBLICOS_PRODUCTO);
    return res.status(200).json(promotions);
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

promotionController.insertPromotion = async (req, res) => {
  try {
    const { title, promoDescription, type, etiqueta, buyQty, payQty, isActive, showBanner, tema, colorFondo, colorFondo2, colorTexto, colorAcento, colorFlecha, icono, imagenCompleta, endsAt } = req.body;
    const items = parseItems(req.body.items);

    if (!promoDescription) {
      return res.status(400).json({ message: "La descripción es requerida" });
    }
    if (!items.length) {
      return res.status(400).json({ message: "Agrega al menos un producto a la promoción" });
    }

    const newPromotion = new promotionModel({
      title,
      promoDescription,
      type: type || "descuento",
      // Solo el anuncio la usa; en los demás el sello sale del ahorro.
      etiqueta: type === "anuncio" ? (etiqueta || "").trim() : "",
      items,
      buyQty: buyQty ? Number(buyQty) : 2,
      payQty: payQty ? Number(payQty) : 1,
      isActive: parseActivo(isActive),
      showBanner: parseActivo(showBanner),
      // Diseño del banner: se usa cuando no hay imagen propia.
      tema: tema || "cafe",
      colorFondo, colorFondo2, colorTexto, colorAcento, colorFlecha,
      icono: icono || "",
      imagenCompleta: imagenCompleta === 'true' || imagenCompleta === true,
      endsAt: parseVencimiento(endsAt),
      image: req.file ? req.file.path : undefined,
      public_id: req.file ? req.file.filename : undefined,
    });

    await newPromotion.save();

    // El volante por correo a quien pidió enterarse de las promociones. SIN await, y no por descuido:
    // escribirle a toda la lista tarda, y la promoción YA está guardada.
    avisarPromoNuevaEnSegundoPlano(newPromotion._id);

    return res.status(201).json({ message: "Promoción creada" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

promotionController.updatePromotion = async (req, res) => {
  try {
    const { title, promoDescription, type, etiqueta, buyQty, payQty, isActive, showBanner, tema, colorFondo, colorFondo2, colorTexto, colorAcento, colorFlecha, icono, imagenCompleta, endsAt, removeImage } = req.body;
    const items = parseItems(req.body.items);

    if (!promoDescription) {
      return res.status(400).json({ message: "La descripción es requerida" });
    }
    if (!items.length) {
      return res.status(400).json({ message: "Agrega al menos un producto a la promoción" });
    }

    const found = await promotionModel.findById(req.params.id);
    if (!found) {
      return res.status(404).json({ message: "No se encontró la promoción" });
    }

    const updatedData = {
      title,
      promoDescription,
      type: type || "descuento",
      // Solo el anuncio la usa; en los demás el sello sale del ahorro.
      etiqueta: type === "anuncio" ? (etiqueta || "").trim() : "",
      items,
      buyQty: buyQty ? Number(buyQty) : 2,
      payQty: payQty ? Number(payQty) : 1,
      isActive: parseActivo(isActive),
      showBanner: parseActivo(showBanner),
      // Diseño del banner: se usa cuando no hay imagen propia.
      tema: tema || "cafe",
      colorFondo, colorFondo2, colorTexto, colorAcento, colorFlecha,
      icono: icono || "",
      imagenCompleta: imagenCompleta === 'true' || imagenCompleta === true,
      endsAt: parseVencimiento(endsAt),
    };

    if (req.file) {
      if (found.public_id) {
        try { await cloudinary.uploader.destroy(found.public_id); } catch (e) { /* ignore */ }
      }
      updatedData.image = req.file.path;
      updatedData.public_id = req.file.filename;
    } else if (removeImage === 'true' || removeImage === true) {
      // Quitó la imagen sin subir otra: se borra de Cloudinary y se limpian los campos para que el
      // banner vuelva a dibujarse con el tema y los colores. Sin este brazo, un update sin archivo
      // dejaba la foto vieja intacta.
      if (found.public_id) {
        try { await cloudinary.uploader.destroy(found.public_id); } catch (e) { /* ignore */ }
      }
      updatedData.image = null;
      updatedData.public_id = null;
      // Sin imagen no puede haber "banner completo": lo apagamos para no esconder
      // el título de una promo que se quedó sin foto.
      updatedData.imagenCompleta = false;
    }

    await promotionModel.findByIdAndUpdate(req.params.id, updatedData, { new: true });

    // La promo que se armó apagada —o sin banner— y se publica hoy. Es un camino normal: se deja lista
    // el jueves y se enciende el viernes a primera hora. Sin esto, esa promo no se anunciaba nunca,
    // porque el aviso solo salía al crearla.
    if (!found.avisoEnviadoEn) {
      avisarPromoNuevaEnSegundoPlano(req.params.id);
    }

    return res.status(200).json({ message: "Promoción actualizada" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

promotionController.deletePromotion = async (req, res) => {
  try {
    const found = await promotionModel.findById(req.params.id);
    if (!found) {
      return res.status(404).json({ message: "No se encontró la promoción" });
    }

    if (found.public_id) {
      try { await cloudinary.uploader.destroy(found.public_id); } catch (e) { /* ignore */ }
    }

    await promotionModel.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: "Promoción eliminada" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default promotionController;
