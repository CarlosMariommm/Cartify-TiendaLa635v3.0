// CUÁNTO CUESTA CADA RENGLÓN DE UN PEDIDO — precioPedido.js
// Calcula el precio de cada renglón con su promoción. La misma cuenta está espejada en la web
// (useStore.js, ShoppingCart.jsx) y en la app (utils/catalogo.js).

const numero = (v) => Number(v) || 0;

// ¿La promo rige ahora mismo? Encendida y sin la fecha pasada — la misma regla que `promoVigente`
// de la tienda.
export const promoVigente = (promo, ahora = new Date()) => {
  if (!promo || promo.isActive === false) return false;
  if (!promo.endsAt) return true;
  const fin = new Date(promo.endsAt);
  return isNaN(fin.getTime()) || fin.getTime() >= ahora.getTime();
};

// Un producto puede estar en VARIAS promos vigentes a la vez —un anuncio que solo lo destaca y un
// descuento que sí le baja el precio—. Gana la que toca el precio por encima del anuncio y, entre
// dos que lo tocan, la más nueva.
const prioridadPromo = (tipo) => (tipo === "anuncio" ? 0 : 1);

// Mapa "id del producto" → la promo que le toca. Las promos pueden venir con los productos
// poblados o como puro id; las dos sirven.
export const construirMapaPromo = (promos, ahora = new Date()) => {
  const mapa = new Map();
  const ordenadas = (promos || [])
    .filter((p) => promoVigente(p, ahora))
    .sort((a, b) =>
      prioridadPromo(b.type) - prioridadPromo(a.type) ||
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

  for (const pr of ordenadas) {
    for (const it of pr.items || []) {
      const pid = it?.productId?._id || it?.productId;
      if (!pid || mapa.has(String(pid))) continue;
      mapa.set(String(pid), {
        type: pr.type,
        discount: numero(it.discount),
        fixedPrice: it.fixedPrice,
        buyQty: pr.buyQty || 2,
        payQty: pr.payQty || 1,
      });
    }
  }
  return mapa;
};

// Precio de UNA unidad —o de una libra, si el producto se vende por peso— con la promo aplicada.
// Hay dos diferencias con la tienda y las dos son a propósito: un descuento de más del 100% y un
// precio fijo que no es un número.
export const precioUnitario = (producto, promo) => {
  const base = numero(producto?.salePrice);

  if (promo?.type === "descuento" && promo.discount > 0) {
    return Math.max(0, Number((base * (1 - promo.discount / 100)).toFixed(2)));
  }

  if (promo?.type === "precio_fijo" && promo.fixedPrice != null && promo.fixedPrice !== "") {
    const fijo = Number(promo.fixedPrice);
    if (Number.isFinite(fijo) && fijo >= 0) return fijo;
  }

  return base;
};

// Cuántas unidades se pagan de las que se lleva. Sin NxM, todas. Con NxM funciona igual con
// libras: 2.5 lb en un 2x1 son un grupo completo (paga 1) más la media libra suelta, que se paga
// entera — 1.5 lb. Es la misma cuenta que hace el carrito, con decimales incluidos.
export const unidadesPagadas = (cantidad, promo) => {
  if (promo?.type !== "nxm") return cantidad;
  const compra = promo.buyQty || 2;
  const paga = promo.payQty || 1;
  if (!(compra > 0) || !(paga >= 0) || paga > compra) return cantidad;

  const grupos = Math.floor(cantidad / compra);
  return grupos * paga + (cantidad % compra);
};

// El `price` que se guarda en el renglón del pedido: lo que de verdad se paga por cada unidad.
export const precioDeRenglon = (producto, promo, cantidad) => {
  const unitario = precioUnitario(producto, promo);
  if (promo?.type !== "nxm") return unitario;
  return Number(((unitario * unidadesPagadas(cantidad, promo)) / cantidad).toFixed(4));
};
