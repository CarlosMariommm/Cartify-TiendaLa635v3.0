/*
 * ============================================================
 * CATÁLOGO — del producto del backend al producto de la tienda
 * ============================================================
 * La traducción que en la web vive dentro de `useStore.js` (`mapearProducto` y
 * `construirMapaPromo`). Aquí va en su propio archivo porque la usan el hook
 * de la tienda y el del carrito, y porque es la pieza que decide QUÉ PRECIO
 * ve el cliente — merece leerse sin tener que recorrer un hook de 300 líneas.
 *
 * Los tres tipos de promoción que tocan el precio:
 *
 *   descuento    → precio con % de descuento (precioAnterior = el original).
 *   precio_fijo  → precio fijo de oferta      (precioAnterior = el original).
 *   nxm          → precio normal; el CARRITO es el que cobra "compra N paga M".
 *
 * Y uno que NO lo toca:
 *
 *   anuncio      → solo le pone su sello al producto para que destaque.
 *
 * Las cuentas son copia literal de la web a propósito. Si aquí se redondeara
 * distinto, el mismo producto costaría un centavo más en el teléfono que en la
 * computadora, y ese centavo llega hasta el recibo.
 * ============================================================
 */

import { promoVigente } from './promos';

// Los productos que toca una promo, ya vengan poblados o como puro id.
export const idsDePromo = (promo) =>
  (promo?.items || [])
    .map((it) => (typeof it.productId === 'object' ? it.productId?._id : it.productId))
    .filter(Boolean);

/*
 * Mapa productId -> info de promo. "Vigente" incluye la fecha: una promo que
 * venció anoche no puede seguir bajando precios hoy solo porque nadie recargó
 * la lista.
 *
 * Un producto puede estar en VARIAS promos vigentes a la vez —un anuncio que
 * solo lo destaca y un descuento que sí le baja el precio—. Gana la que toca
 * el precio por encima del anuncio y, entre dos que lo tocan, la más nueva.
 *
 * Aquí ganaba la primera de la lista, y la web ya no hacía eso. Mientras el
 * servidor cobraba el precio que mandaba cada uno daba igual; ahora el precio
 * lo decide él, con la regla de la web (ver backend/src/utils/precioPedido.js),
 * y si la app eligiera otra promo, el cliente vería un precio en el teléfono
 * y pagaría otro.
 */
const prioridadPromo = (tipo) => (tipo === 'anuncio' ? 0 : 1);

export const construirMapaPromo = (promos) => {
  const mapa = {};
  const ordenadas = (promos || [])
    .filter(promoVigente)
    .sort((a, b) =>
      prioridadPromo(b.type) - prioridadPromo(a.type) ||
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

  ordenadas.forEach((pr) => {
    (pr.items || []).forEach((it) => {
      const pid = typeof it.productId === 'object' ? it.productId?._id : it.productId;
      if (!pid || mapa[pid]) return;
      mapa[pid] = {
        type: pr.type,
        discount: it.discount || 0,
        fixedPrice: it.fixedPrice,
        buyQty: pr.buyQty || 2,
        payQty: pr.payQty || 1,
        // Solo el anuncio la trae: es su sello, ya que no tiene ahorro.
        etiqueta: pr.etiqueta || '',
      };
    });
  });
  return mapa;
};

// Adapta un producto real al formato de la tienda, aplicando su promo si tiene.
export const mapearProducto = (p, mapaPromo = {}) => {
  const base = Number(p.salePrice) || 0;
  const promo = mapaPromo[p._id];
  let precio = base;
  let precioAnterior = null;
  let promoInfo = null;

  if (promo) {
    if (promo.type === 'descuento' && promo.discount > 0) {
      precio = Number((base * (1 - promo.discount / 100)).toFixed(2));
      precioAnterior = base;
      promoInfo = { type: 'descuento', discount: promo.discount };
    } else if (promo.type === 'precio_fijo' && promo.fixedPrice != null && promo.fixedPrice !== '') {
      precio = Number(promo.fixedPrice);
      precioAnterior = base;
      promoInfo = { type: 'precio_fijo' };
    } else if (promo.type === 'nxm') {
      promoInfo = { type: 'nxm', buyQty: promo.buyQty, payQty: promo.payQty };
    } else if (promo.type === 'anuncio') {
      /*
       * El anuncio NO toca el precio. Por eso no se define precioAnterior — si
       * no, la tarjeta mostraría un precio tachado igual al vigente.
       */
      promoInfo = { type: 'anuncio', etiqueta: promo.etiqueta || 'Nuevo' };
    }
  }

  return {
    id: p._id,
    nombre: p.name || '',
    marca: p.brandId?.name || '',
    categoria: p.typeId?.type || 'General',
    modulo: p.moduleId?.name || '',
    moduloId: p.moduleId?._id || p.moduleId || null,
    precio,
    precioAnterior,
    promo: promoInfo,
    descripcion: p.description || '',
    // Cómo se vende: lo necesitan la tarjeta (para el "/lb") y el carrito
    // (para moverse de media en media libra). Ver utils/unidades.js.
    unidadVenta: p.unidadVenta === 'libra' ? 'libra' : 'unidad',
    // En cuántas piezas están esas libras, y si la venta es solo para mayores.
    piezas: p.piezas ?? null,
    soloAdultos: !!p.soloAdultos,
    stock: Number(p.stock) || 0,
    stockMaximo: Number(p.maxQuantity) || 0,
    imagen: Array.isArray(p.image) ? p.image[0] : p.image,
    // De dónde salió la foto si no es de la tienda (Open Food Facts, al importar
    // desde Excel): la ficha da el crédito que pide su licencia.
    fotoFuente: p.fotoFuente || '',
    fechaExpiracion: p.expirationDate,
    creadoEn: p.createdAt,
  };
};

/*
 * El catálogo entero, ya listo para pintar. Se filtran los inactivos aquí y no
 * en la pantalla: un producto dado de baja no existe para el cliente, y
 * dejarlo pasar obligaría a acordarse de filtrarlo en la portada, en la
 * búsqueda y en el carrito por separado.
 */
export const mapearCatalogo = (productos, promociones) => {
  const activos = (Array.isArray(productos) ? productos : []).filter((p) => p.isActive !== false);
  const mapaPromo = construirMapaPromo(promociones);
  return activos.map((p) => mapearProducto(p, mapaPromo));
};

/*
 * Lo que de verdad se cobra por una línea del carrito.
 *
 * En una promo NxM (2x1) el cliente se lleva N y paga M, así que el total de
 * la línea NO es precio × cantidad. Vive aquí y no en la pantalla del carrito
 * porque lo necesitan los dos: la línea y el total de abajo, y si cada uno
 * hiciera su propia cuenta acabarían discrepando por un centavo.
 */
export const totalDeLinea = (item) => {
  if (item?.promo?.type === 'nxm') {
    const compra = item.promo.buyQty || 2;
    const paga = item.promo.payQty || 1;
    const grupos = Math.floor(item.cantidad / compra);
    const pagados = grupos * paga + (item.cantidad % compra);
    return item.precio * pagados;
  }
  return (Number(item?.precio) || 0) * (Number(item?.cantidad) || 0);
};
