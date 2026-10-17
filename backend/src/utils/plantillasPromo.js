// PLANTILLAS DE PROMOCIÓN — plantillasPromo.js
// El plan B (y el plan A si nadie configura la llave de la IA). Arma el texto de una promoción con
// puras reglas: sin internet, sin llaves, sin costo y sin fallar nunca.

const dinero = (n) => `$${(Number(n) || 0).toFixed(2)}`;

// "Queso" · "Queso y Crema" · "Queso, Crema y 3 más"
const listarNombres = (items) => {
  const nombres = items.map((it) => it.name);
  if (nombres.length === 1) return nombres[0];
  if (nombres.length === 2) return `${nombres[0]} y ${nombres[1]}`;
  return `${nombres[0]}, ${nombres[1]} y ${nombres.length - 2} más`;
};

// Un poco de variedad para que no salga siempre el mismo titular.
const alAzar = (opciones) => opciones[Math.floor(Math.random() * opciones.length)];

const recortar = (texto, max) =>
  texto.length <= max ? texto : `${texto.slice(0, max - 1).trimEnd()}…`;

/* ---------- Descuento por porcentaje ---------- */
const porDescuento = (items) => {
  const mayor = Math.max(...items.map((it) => Number(it.discount) || 0));
  const nombres = listarNombres(items);
  const uno = items.length === 1;
  const producto = items[0];
  const final = uno ? producto.salePrice * (1 - mayor / 100) : null;

  return {
    title: uno ? `${mayor}% menos en ${producto.name}` : `Hasta ${mayor}% de descuento`,
    promoDescription: uno
      ? `Llévese ${producto.name} con ${mayor}% de descuento: de ${dinero(producto.salePrice)} a ${dinero(final)}.`
      : `Aproveche hasta ${mayor}% de descuento en ${nombres}.`,
    bannerHeadline: alAzar([`${mayor}% MENOS`, `AHORRE ${mayor}%`, `${mayor}% DE DESCUENTO`]),
    bannerSubtitle: uno ? `${producto.name}, antes ${dinero(producto.salePrice)}` : `En ${nombres}`,
    badge: `-${mayor}%`,
  };
};

/* ---------- Precio fijo de oferta ---------- */
const porPrecioFijo = (items) => {
  const uno = items.length === 1;
  const producto = items[0];
  const menor = Math.min(...items.map((it) => Number(it.fixedPrice) || 0));

  return {
    title: uno ? `${producto.name} a ${dinero(producto.fixedPrice)}` : `Ofertas desde ${dinero(menor)}`,
    promoDescription: uno
      ? `${producto.name} a solo ${dinero(producto.fixedPrice)}. Antes ${dinero(producto.salePrice)}.`
      : `Precios especiales en ${listarNombres(items)}, desde ${dinero(menor)}.`,
    bannerHeadline: uno ? `A SOLO ${dinero(producto.fixedPrice)}` : `DESDE ${dinero(menor)}`,
    bannerSubtitle: uno ? `${producto.name}, antes ${dinero(producto.salePrice)}` : `En ${listarNombres(items)}`,
    badge: dinero(uno ? producto.fixedPrice : menor),
  };
};

/* ---------- NxM (2x1, 3x2...) ---------- */
const porNxM = (items, buyQty, payQty) => {
  const nombres = listarNombres(items);
  const gratis = buyQty - payQty;

  return {
    title: `${buyQty}x${payQty} en ${nombres}`,
    promoDescription: `Lleve ${buyQty} y pague solo ${payQty}. Aplica en ${nombres}.`,
    bannerHeadline: alAzar([`${buyQty}x${payQty}`, `LLEVE ${buyQty} PAGUE ${payQty}`]),
    bannerSubtitle: gratis === 1 ? `Uno gratis en ${nombres}` : `${gratis} gratis en ${nombres}`,
    badge: `${buyQty}x${payQty}`,
  };
};

/* ---------- Anuncio (sin cambio de precio) ---------- */
// Aquí no hay ahorro que contar, así que el gancho es el producto: que exista, que acabe de
// llegar, que lo hagan ellos. Las plantillas quedan más pobres que en los otros tipos justamente
// por eso — es el caso donde más se nota cuando la IA está disponible.
const porAnuncio = (items) => {
  const uno = items.length === 1;
  const producto = items[0];
  const nombres = listarNombres(items);

  return {
    title: uno ? `Ya tenemos ${producto.name}` : `Encuentre ${nombres} aquí`,
    promoDescription: uno
      ? `${producto.name} disponible en la tienda a ${dinero(producto.salePrice)}.`
      : `${nombres}, listos para llevar en la tienda.`,
    bannerHeadline: alAzar(["YA LLEGÓ", "NUEVO EN LA TIENDA", "RECIÉN LLEGADO"]),
    bannerSubtitle: uno ? `${producto.name} a ${dinero(producto.salePrice)}` : nombres,
    badge: "Nuevo",
  };
};

// Genera el texto completo de la promo. Mismos campos que devuelve la IA, así el formulario no
// tiene que saber de dónde vino.
export const generarCopyPlantilla = ({ type, items, buyQty = 2, payQty = 1 }) => {
  let copy;
  if (type === "anuncio") copy = porAnuncio(items);
  else if (type === "precio_fijo") copy = porPrecioFijo(items);
  else if (type === "nxm") copy = porNxM(items, Number(buyQty) || 2, Number(payQty) || 1);
  else copy = porDescuento(items);

  // Los mismos límites que le pedimos a la IA, para que el banner no se
  // desborde ni el título rompa la tarjeta.
  return {
    title: recortar(copy.title, 40),
    promoDescription: recortar(copy.promoDescription, 95),
    bannerHeadline: recortar(copy.bannerHeadline, 22),
    bannerSubtitle: recortar(copy.bannerSubtitle, 40),
    badge: recortar(copy.badge, 10),
  };
};
