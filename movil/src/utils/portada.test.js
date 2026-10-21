import { describe, expect, it } from 'vitest';
import { resolverPortada, bloqueDeSeccion } from './portada';
import { armarSecciones } from './secciones';

// La portada de la app sigue lo que el dueño eligió en el panel, igual que la web.
describe('portada de la app', () => {
  it('respeta el orden y lo apagado que guardó el panel', () => {
    const guardadas = [
      { clave: 'nuevos', visible: true, orden: 0 },
      { clave: 'promos', visible: true, orden: 1 },
      { clave: 'mas-vendidos', visible: false, orden: 2 },
    ];
    const visibles = resolverPortada(guardadas).filter((b) => b.visible).map((b) => b.clave);
    expect(visibles.slice(0, 2)).toEqual(['nuevos', 'promos']);
    expect(visibles).not.toContain('mas-vendidos');
  });

  it('sin nada guardado sale el orden de fábrica, todo encendido', () => {
    expect(resolverPortada([]).map((b) => b.clave)).toEqual([
      'promos', 'mas-vendidos', 'volver-a-comprar', 'por-acabarse', 'nuevos', 'familias',
    ]);
  });

  it('los estantes automáticos van todos en el bloque "familias"', () => {
    expect(bloqueDeSeccion('familia-quesos')).toBe('familias');
    expect(bloqueDeSeccion('nuevos')).toBe('nuevos');
  });
});

describe('filas automáticas de la app', () => {
  const producto = (id, nombre) => ({ id, nombre, stock: 5, stockMaximo: 10, creadoEn: '2026-10-01' });
  const catalogo = [
    producto('1', 'Queso fresco'), producto('2', 'Queso duro'),
    producto('3', 'Queso cheddar'), producto('4', 'Queso crema'),
    producto('5', 'Leche entera'),
  ];

  it('arma "Volver a comprar" con lo último que llevó primero', () => {
    const pedidos = [
      { createdAt: '2026-10-01', items: [{ productId: '1' }] },
      { createdAt: '2026-10-10', items: [{ productId: { _id: '5' } }, { productId: '1' }] },
    ];
    const fila = armarSecciones(catalogo, pedidos).find((s) => s.clave === 'volver-a-comprar');
    expect(fila.productos.map((p) => p.id)).toEqual(['5', '1']);
  });

  it('arma el estante de quesos', () => {
    const fila = armarSecciones(catalogo).find((s) => s.clave === 'familia-quesos');
    expect(fila.productos).toHaveLength(4);
    expect(fila.subtituloVars).toEqual({ n: 4 });
  });
});
