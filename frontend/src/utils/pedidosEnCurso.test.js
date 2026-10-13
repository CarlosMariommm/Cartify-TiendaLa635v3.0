import { describe, it, expect } from 'vitest';
import { pedidosEnCurso, pedidosNuevos } from './pedidosEnCurso';

const p = (id, status, deliveryType, createdAt) => ({ _id: id, status, deliveryType, createdAt });

describe('los pedidos en curso', () => {
  it('el que va en camino va primero aunque haya uno más nuevo para recoger', () => {
    const lista = pedidosEnCurso([
      p('domicilio', 'en_camino', 'delivery', '2026-10-11T10:00:00Z'),
      p('recoger', 'preparando', 'retiro', '2026-10-11T10:20:00Z'),
    ]);
    expect(lista.map((o) => o._id)).toEqual(['domicilio', 'recoger']);
  });

  it('después el que está listo para recoger, luego lo que se prepara y lo recién recibido', () => {
    const lista = pedidosEnCurso([
      p('a', 'pagado', 'delivery', '2026-10-11T10:30:00Z'),
      p('b', 'preparando', 'delivery', '2026-10-11T10:10:00Z'),
      p('c', 'listo', 'retiro', '2026-10-11T09:00:00Z'),
    ]);
    expect(lista.map((o) => o._id)).toEqual(['c', 'b', 'a']);
  });

  it('entre dos del mismo paso, el más reciente primero; los cerrados no cuentan', () => {
    const lista = pedidosEnCurso([
      p('viejo', 'preparando', 'retiro', '2026-10-11T08:00:00Z'),
      p('nuevo', 'preparando', 'delivery', '2026-10-11T09:00:00Z'),
      p('listo-ya', 'entregado', 'delivery', '2026-10-11T07:00:00Z'),
      p('cancelado', 'cancelado', 'retiro', '2026-10-11T11:00:00Z'),
    ]);
    expect(lista.map((o) => o._id)).toEqual(['nuevo', 'viejo']);
    expect(pedidosEnCurso(null)).toEqual([]);
  });

  it('distingue un pedido nuevo de uno que solo cambió de paso', () => {
    expect(pedidosNuevos(['a', 'b'], ['b', 'a'])).toEqual([]);
    expect(pedidosNuevos(['a'], ['c', 'a'])).toEqual(['c']);
  });
});
