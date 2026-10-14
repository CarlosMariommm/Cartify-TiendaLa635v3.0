/*
 * ============================================================
 * LOS FILTROS DE LA TIENDA — filtrosTienda.js
 * ============================================================
 * Lo que el cliente puede elegir sobre la lista de productos, además del
 * pasillo, la categoría y la búsqueda:
 *
 *   orden            recomendados (como la tienda los acomoda), menor o mayor
 *                    precio, nombre o lo más nuevo;
 *   precio           hasta $4, de $4 a $12, más de $12;
 *   soloOferta       con descuento, precio especial o 2x1;
 *   soloDisponibles  sin lo agotado;
 *   marca            una marca de las que hay en la lista.
 *
 * ⚠️  ESPEJADO en movil/src/utils/filtrosTienda.js: la web y la app filtran
 *     igual. Si cambia una regla aquí, cámbiala allá.
 * ============================================================
 */

export const FILTROS_VACIOS = { orden: 'recomendados', precio: 'todos', soloOferta: false, soloDisponibles: false, marca: '' };

export const ORDENES_TIENDA = [
  { valor: 'recomendados', texto: 'Recomendados' },
  { valor: 'precio-asc', texto: 'Menor precio' },
  { valor: 'precio-desc', texto: 'Mayor precio' },
  { valor: 'nombre', texto: 'Nombre (A-Z)' },
  { valor: 'nuevos', texto: 'Lo más nuevo' },
];

export const RANGOS_PRECIO = [
  { valor: 'todos', texto: 'Todos', cabe: () => true },
  { valor: '0-4', texto: 'Menos de $4', cabe: (p) => p <= 4 },
  { valor: '4-12', texto: 'De $4 a $12', cabe: (p) => p > 4 && p <= 12 },
  { valor: '12+', texto: 'Más de $12', cabe: (p) => p > 12 },
];

// En oferta: con precio rebajado o con un 2x1. Un anuncio ("Nuevo") no es oferta.
export const enOferta = (p) => Boolean(p?.precioAnterior) || (Boolean(p?.promo) && p.promo.type !== 'anuncio');

const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Las marcas de la lista, en orden alfabético, para elegir una.
export const marcasDe = (productos) =>
  [...new Set((productos || []).map((p) => p.marca).filter(Boolean))].sort((a, b) => plano(a).localeCompare(plano(b), 'es'));

// Cuántos filtros hay puestos (el orden no cuenta: no quita productos).
export const cuantosFiltros = (f) =>
  [f.precio !== 'todos', f.soloOferta, f.soloDisponibles, Boolean(f.marca)].filter(Boolean).length;

const fecha = (p) => {
  const t = Date.parse(p?.creadoEn);
  return Number.isNaN(t) ? 0 : t;
};

export const aplicarFiltros = (productos, f = FILTROS_VACIOS) => {
  const rango = RANGOS_PRECIO.find((r) => r.valor === f.precio) || RANGOS_PRECIO[0];
  const lista = (productos || []).filter((p) =>
    rango.cabe(Number(p.precio) || 0)
    && (!f.soloOferta || enOferta(p))
    && (!f.soloDisponibles || Number(p.stock) > 0)
    && (!f.marca || p.marca === f.marca));
  // "Recomendados" deja el orden de la tienda tal cual.
  const comparar = {
    'precio-asc': (a, b) => (Number(a.precio) || 0) - (Number(b.precio) || 0),
    'precio-desc': (a, b) => (Number(b.precio) || 0) - (Number(a.precio) || 0),
    nombre: (a, b) => plano(a.nombre).localeCompare(plano(b.nombre), 'es'),
    nuevos: (a, b) => fecha(b) - fecha(a),
  }[f.orden];
  return comparar ? [...lista].sort(comparar) : lista;
};
