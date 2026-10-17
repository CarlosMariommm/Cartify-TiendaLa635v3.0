// QUIEN COMPRA ESTO TAMBIÉN LLEVA — tambienLlevan.js
// El servidor dice, por producto, lo que más se lleva con él en un mismo pedido (GET
// /product/tambien-llevan; ver backend/src/utils/tambienLlevan.js).

export const CUANTOS = 5;

const soloAdultos = (p) => !!p?.soloAdultos;

export const elegirTambienLlevan = (ids, catalogo, producto, cuantos = CUANTOS) => {
  if (!producto || !Array.isArray(ids) || !ids.length) return [];
  const porId = new Map((catalogo || []).map((p) => [String(p.id), p]));
  const adultos = soloAdultos(producto);
  return ids
    .map((id) => porId.get(String(id)))
    .filter((p) => p && p.id !== producto.id && Number(p.stock) > 0 && (adultos || !soloAdultos(p)))
    .slice(0, cuantos);
};
