/**
 * @swagger
 * components:
 *   schemas:
 *     PromotionItem:
 *       type: object
 *       properties:
 *         productId:
 *           type: string
 *           description: ObjectId del producto incluido en la promoción.
 *           example: 68932f1a2b3c4d5e6f7a8b9c
 *         discount:
 *           type: number
 *           description: Porcentaje de descuento (solo tipo "descuento").
 *           example: 15
 *         fixedPrice:
 *           type: number
 *           description: Precio fijo de oferta (solo tipo "precio_fijo").
 *           example: 2999
 *     Promotion:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68932f1a2b3c4d5e6f7a8b70
 *         title:
 *           type: string
 *           example: Ofertas de fin de mes
 *         image:
 *           type: string
 *           example: https://res.cloudinary.com/demo/image/upload/v1/promotions/banner.png
 *         promoDescription:
 *           type: string
 *           example: 15% de descuento en productos seleccionados de granos.
 *         type:
 *           type: string
 *           enum: [descuento, precio_fijo, nxm]
 *           default: descuento
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PromotionItem'
 *         buyQty:
 *           type: number
 *           description: Cantidad a comprar (solo tipo "nxm").
 *           default: 2
 *         payQty:
 *           type: number
 *           description: Cantidad a pagar (solo tipo "nxm").
 *           default: 1
 *         isActive:
 *           type: boolean
 *           default: true
 *       required:
 *         - promoDescription
 *     PromotionInput:
 *       type: object
 *       description: Payload multipart/form-data. "items" viaja como un string JSON serializado, ej. '[{"productId":"...","discount":15}]'.
 *       properties:
 *         title:
 *           type: string
 *         promoDescription:
 *           type: string
 *         type:
 *           type: string
 *           enum: [descuento, precio_fijo, nxm]
 *         items:
 *           type: string
 *           description: JSON.stringify de un arreglo de PromotionItem. Debe tener al menos un elemento.
 *           example: '[{"productId":"68932f1a2b3c4d5e6f7a8b9c","discount":15}]'
 *         buyQty:
 *           type: number
 *         payQty:
 *           type: number
 *         isActive:
 *           type: boolean
 *         image:
 *           type: string
 *           format: binary
 *       required:
 *         - promoDescription
 *         - items
 */

import mongoose, { Schema, model } from "mongoose";

// Promoción / Anuncio de la tienda — soporta 3 tipos: - 'descuento' : cada producto con SU % de
// descuento. (items[].discount) - 'precio_fijo' : cada producto con un precio fijo de oferta.
// (items[].fixedPrice) - 'nxm' : compra N, paga M sobre los productos. (buyQty/payQty)
const promoItemSchema = new Schema(
  {
    // ref = nombre del MODELO registrado ('productModel'), no el de la colección.
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "productModel" },
    discount: { type: Number, default: 0 },   // % (tipo 'descuento')
    fixedPrice: { type: Number },              // $ (tipo 'precio_fijo')
    // De dónde salió este producto. Si se agregó eligiendo una categoría completa, se guarda cuál: la
    // promo queda con los productos uno por uno (una foto del momento), pero el admin ve "Lácteos · 12
    // productos" en vez de doce filas sueltas y puede quitarlos de un golpe.
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "productTypeModel" },
    categoryName: { type: String },
  },
  { _id: false }
);

const promotionSchema = new mongoose.Schema(
  {
    title: { type: String },
    image: { type: String },
    public_id: { type: String },
    promoDescription: { type: String, required: true },
    type: {
      type: String,
      // 'anuncio' no toca precios: sirve para poner un producto o una categoría al frente de la tienda
      // sin rebajarlos.
      enum: ["descuento", "precio_fijo", "nxm", "anuncio"],
      default: "descuento",
    },
    // Texto corto del sello. Solo lo usa 'anuncio': los otros tipos lo calculan de la oferta ("-25%",
    // "2x1"), pero un anuncio no tiene número que mostrar, así que lleva una palabra: Nuevo, De la
    // casa, Recomendado.
    etiqueta: { type: String, default: '' },
    items: [promoItemSchema],
    buyQty: { type: Number, default: 2 }, // NxM: compra N
    payQty: { type: Number, default: 1 }, // NxM: paga M
    // Diseño del banner. La imagen sigue existiendo por si la tienda diseñó su propio banner: si la
    // sube, manda ella y estos colores no se usan.
    tema: { type: String, default: 'cafe' },   // paleta elegida (ver temasPromo)
    colorFondo: { type: String },              // hex, solo si eligió "personalizado"
    colorFondo2: { type: String },             // segundo color: arma el degradado
    colorTexto: { type: String },
    colorAcento: { type: String },             // píldora de la etiqueta
    colorFlecha: { type: String },             // círculo de la flecha; si falta, usa el acento
    // Icono del banner (ver iconosPromo). Se dibuja en la píldora y en grande de marca de agua, para
    // que el banner tenga cara sin depender de una foto.
    icono: { type: String, default: '' },
    // Si la tienda diseñó su propio banner entero (1200×480), la imagen ocupa toda la tarjeta y el
    // texto no se dibuja encima. En falso —lo normal— la imagen acompaña a un lado y el título sigue
    // leyéndose.
    imagenCompleta: { type: Boolean, default: false },

    // Vencimiento (opcional). Al pasar la fecha la promo deja de aplicarse y de anunciarse sola: nadie
    // tiene que acordarse de apagarla un domingo. Se guarda al FINAL del día elegido, así "vence el 3"
    // incluye todo el 3.
    endsAt: { type: Date, default: null },

    // Cuándo salió el correo avisando de esta promoción, si salió. Existe para que salga UNA sola vez.
    // Sin esta marca, editar la promo para corregirle una palabra al título volvería a escribirle a
    // toda la lista de clientes — y a la tercera corrección la tienda ya es spam.
    avisoEnviadoEn: { type: Date, default: null },

    isActive: { type: Boolean, default: true },
    // ¿Se anuncia en la tienda con banner? Si va en false, la promo SIGUE aplicando su descuento en
    // los precios y en el carrito, pero no aparece en el carrusel. Sirve para descuentos silenciosos
    // (liquidar algo sin publicarlo).
    showBanner: { type: Boolean, default: true },
  },
  { timestamps: true, strict: false }
);

export default model('promotionModel', promotionSchema, 'Promotions');
