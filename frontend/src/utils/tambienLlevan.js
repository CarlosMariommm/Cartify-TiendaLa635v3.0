/*
 * ============================================================
 * QUIEN COMPRA ESTO TAMBIÉN LLEVA — tambienLlevan.js
 * ============================================================
 * El servidor dice, por producto, lo que más se lleva con él en un mismo
 * pedido (GET /product/tambien-llevan, ver backend/src/utils/tambienLlevan.js).
 * Aquí se escoge qué se muestra en la ficha:
 *
 *   - solo lo que está en el catálogo cargado (activo) y con existencias;
 *   - nada +18 junto a un producto que no lo es: la recomendación no tiene
 *     por qué ofrecerle cerveza a quien vino por leche;
 *   - cinco como mucho, en el orden del servidor (lo que más va junto
 *     primero), sin repetir el que ya se está viendo.
 *
 * La lista se pide una sola vez por visita y se comparte entre fichas: no
 * cambia de un producto a otro, y así cada ficha la tiene al instante.
 * ============================================================
 */

import { productService } from '../api/productService';
import { esSoloAdultos } from './unidades';

export const CUANTOS = 5;

export const elegirTambienLlevan = (ids, catalogo, producto, cuantos = CUANTOS) => {
  if (!producto || !Array.isArray(ids) || !ids.length) return [];
  const porId = new Map((catalogo || []).map((p) => [String(p.id), p]));
  const adultos = esSoloAdultos(producto);
  return ids
    .map((id) => porId.get(String(id)))
    .filter((p) => p && p.id !== producto.id && Number(p.stock) > 0 && (adultos || !esSoloAdultos(p)))
    .slice(0, cuantos);
};

let pedido = null;

// La lista de toda la tienda, pedida una vez. Si falla, vacía: la ficha sigue con "Del mismo pasillo".
export const cargarTambienLlevan = () => {
  if (!pedido) {
    pedido = productService.getTambienLlevan()
      .then((r) => (r && typeof r.productos === 'object' && r.productos) || {})
      .catch(() => {
        pedido = null; // la próxima ficha lo vuelve a intentar
        return {};
      });
  }
  return pedido;
};

// Para las pruebas.
export const olvidarTambienLlevan = () => { pedido = null; };
