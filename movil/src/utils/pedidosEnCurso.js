/*
 * ============================================================
 * LOS PEDIDOS EN CURSO — pedidosEnCurso.js
 * ============================================================
 * Un cliente puede tener más de un pedido abierto a la vez: uno a domicilio y
 * otro para recoger, por ejemplo. La burbuja antes mostraba solo el MÁS
 * RECIENTE, y pasó en una prueba: el de recoger (hecho después) tapaba al de
 * domicilio que ya iba en camino, y el cliente se quedaba sin ver el mapa.
 *
 * Ahora van en orden de lo que más le importa al cliente en este momento:
 *   1. el que va en camino (hay que estar pendiente de la puerta);
 *   2. el que ya está listo para recoger;
 *   3. el que se está preparando;
 *   4. el recién recibido.
 * Entre dos del mismo paso, el más reciente primero.
 *
 * Está igual en la web y en la app (frontend/ y movil/, src/utils/pedidosEnCurso.js).
 * ============================================================
 */

export const ESTADOS_EN_CURSO = ['pagado', 'preparando', 'en_camino', 'listo'];

const PRIORIDAD = { en_camino: 0, listo: 1, preparando: 2, pagado: 3 };

export const pedidosEnCurso = (pedidos) =>
  (Array.isArray(pedidos) ? pedidos : [])
    .filter((p) => ESTADOS_EN_CURSO.includes(p?.status))
    .sort(
      (a, b) =>
        PRIORIDAD[a.status] - PRIORIDAD[b.status] ||
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

/*
 * Los pedidos activos que no estaban la vez anterior: un pedido NUEVO (recién
 * hecho), no uno que cambió de paso. La burbuja los usa para saber cuándo
 * volver a empezar en vez de quedarse en el que el cliente había elegido.
 */
export const pedidosNuevos = (antes, ahora) => {
  const vistos = new Set(antes);
  return ahora.filter((id) => !vistos.has(id));
};
