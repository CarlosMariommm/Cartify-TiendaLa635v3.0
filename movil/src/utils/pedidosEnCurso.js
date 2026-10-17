// LOS PEDIDOS EN CURSO — pedidosEnCurso.js
// Un cliente puede tener más de un pedido abierto a la vez: uno a domicilio y otro para recoger,
// por ejemplo.

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

// Los pedidos activos que no estaban la vez anterior: un pedido NUEVO (recién hecho), no uno que
// cambió de paso. La burbuja los usa para saber cuándo volver a empezar en vez de quedarse en el
// que el cliente había elegido.
export const pedidosNuevos = (antes, ahora) => {
  const vistos = new Set(antes);
  return ahora.filter((id) => !vistos.has(id));
};
