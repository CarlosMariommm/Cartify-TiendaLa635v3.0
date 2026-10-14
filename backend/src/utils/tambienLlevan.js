/*
 * ============================================================
 * QUIEN COMPRA ESTO TAMBIÉN LLEVA — tambienLlevan.js
 * ============================================================
 * Para cada producto, lo que más se lleva con él EN EL MISMO PEDIDO, sacado
 * de los pedidos de verdad (los últimos 180 días, sin cancelados). La ficha
 * del producto en la web y en la app lo muestra arriba de "Del mismo pasillo".
 *
 * Cómo se decide, con las cuentas que usa cualquier "también compraron":
 *
 *   juntos     en cuántos pedidos aparecen los dos;
 *   confianza  de los pedidos que llevan A, en qué parte va también B. Se
 *              toma la cuenta PESIMISTA (el límite de abajo de Wilson, al
 *              95%): con 2 de 3 pedidos no se sabe lo mismo que con 40 de 60,
 *              y la cuenta pesimista es la que lo nota;
 *   lift       esa confianza contra lo que B se vende de por sí. Más de 1
 *              quiere decir que van juntos MÁS de lo que tocaría por azar.
 *              Sin esto, lo más vendido (la Coca-Cola) saldría recomendado
 *              con todo, y eso no dice nada.
 *
 * Se recomienda B para A si van juntos en 2 pedidos o más, de 2 PERSONAS
 * distintas o más, y si aun con la cuenta pesimista el lift pasa de 1. Con
 * solo "lift > 1", en la demostración salía la cerveza junto a la leche por
 * dos pedidos de casualidad. El orden, por la confianza pesimista.
 *
 * Lo de las 2 personas es por privacidad: con una sola, "quien compra esto
 * también lleva" contaría lo que compró alguien en particular.
 *
 * Solo salen ids de productos activos; cada pantalla los busca en el catálogo
 * que ya tiene y quita lo agotado. Se calcula todo junto y se guarda una hora.
 * ============================================================
 */

import orderModel from "../models/order.js";
import productModel from "../models/product.js";

export const DIAS = 180;
export const MINIMO_PEDIDOS = 2;
export const MINIMO_PERSONAS = 2;
// Más de los que se muestran (5): la pantalla todavía quita lo agotado y lo +18.
export const POR_PRODUCTO = 8;
const VIGENCIA_MS = 60 * 60 * 1000;

const sumar = (mapa, clave, n = 1) => mapa.set(clave, (mapa.get(clave) || 0) + n);

// Límite de abajo de Wilson: la proporción k/n, contada con pesimismo (95%, una cola).
const Z = 1.6449;
export const confianzaPesimista = (k, n) => {
  if (!n) return 0;
  const p = k / n;
  const z2 = Z * Z;
  const centro = p + z2 / (2 * n);
  const margen = Z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return Math.max(0, (centro - margen) / (1 + z2 / n));
};

/*
 * pedidos: [{ clientId, items: [{ productId }] }]. `activos`: Set de ids que
 * se pueden recomendar (sin él, todos). Devuelve { idProducto: [ids] }.
 */
export const calcularTambienLlevan = (pedidos, { activos = null, cuantos = POR_PRODUCTO } = {}) => {
  const conProducto = new Map(); // producto → en cuántos pedidos va
  const juntos = new Map(); // producto → Map(otro → pedidos juntos)
  const personas = new Map(); // "a|b" → Set de quién los llevó juntos
  let total = 0;

  for (const pedido of pedidos || []) {
    const ids = [...new Set((pedido?.items || [])
      .map((i) => (i?.productId ? String(i.productId) : ""))
      .filter(Boolean))];
    if (!ids.length) continue;
    total += 1;
    const persona = String(pedido.clientId || "");
    for (const a of ids) {
      sumar(conProducto, a);
      for (const b of ids) {
        if (a === b) continue;
        if (!juntos.has(a)) juntos.set(a, new Map());
        sumar(juntos.get(a), b);
        if (persona) {
          const par = `${a}|${b}`;
          if (!personas.has(par)) personas.set(par, new Set());
          personas.get(par).add(persona);
        }
      }
    }
  }

  const resultado = {};
  for (const [a, otros] of juntos) {
    if (activos && !activos.has(a)) continue;
    const pedidosConA = conProducto.get(a);
    const lista = [];
    for (const [b, n] of otros) {
      if (activos && !activos.has(b)) continue;
      if (n < MINIMO_PEDIDOS || (personas.get(`${a}|${b}`)?.size || 0) < MINIMO_PERSONAS) continue;
      const confianza = confianzaPesimista(n, pedidosConA);
      const lift = confianza / (conProducto.get(b) / total);
      if (lift > 1) lista.push({ id: b, confianza, n });
    }
    lista.sort((x, y) => y.confianza - x.confianza || y.n - x.n || (x.id < y.id ? -1 : 1));
    if (lista.length) resultado[a] = lista.slice(0, cuantos).map((r) => r.id);
  }
  return resultado;
};

/* ══════════ De la base, guardado una hora ══════════ */

const estado = { datos: null, hasta: 0, enCamino: null };

export const olvidarTambienLlevan = () => {
  estado.datos = null;
  estado.hasta = 0;
  estado.enCamino = null;
};

const calcularDeLaBase = async (ahora) => {
  const desde = new Date(ahora.getTime() - DIAS * 24 * 60 * 60 * 1000);
  const [pedidos, productos] = await Promise.all([
    orderModel.find({ status: { $ne: "cancelado" }, createdAt: { $gte: desde } })
      .select("clientId items.productId")
      .lean(),
    productModel.find({ isActive: { $ne: false } }).select("_id").lean(),
  ]);
  return calcularTambienLlevan(pedidos, { activos: new Set(productos.map((p) => String(p._id))) });
};

export const obtenerTambienLlevan = async ({ ahora = new Date() } = {}) => {
  if (estado.datos && ahora.getTime() < estado.hasta) return estado.datos;
  // Si llegan varias fichas a la vez, se espera el mismo cálculo.
  if (!estado.enCamino) {
    estado.enCamino = calcularDeLaBase(ahora)
      .then((datos) => {
        estado.datos = datos;
        estado.hasta = ahora.getTime() + VIGENCIA_MS;
        return datos;
      })
      .finally(() => { estado.enCamino = null; });
  }
  return estado.enCamino;
};
