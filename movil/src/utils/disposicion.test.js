import { describe, it, expect } from 'vitest';
import { anchoDeCelda, columnasPara } from './disposicion';

// Cuántas tarjetas de producto caben por fila. En el teléfono tienen que ser 2 siempre (así se
// diseñó la tarjeta); en la tablet, más, pero sin pasar de 5.
describe('columnas del catálogo', () => {
  it('en cualquier teléfono, 2', () => {
    for (const ancho of [320, 360, 393, 412, 430]) expect(columnasPara(ancho, false)).toBe(2);
  });

  it('en un teléfono acostado caben más', () => {
    expect(columnasPara(844, false)).toBeGreaterThan(2);
  });

  it('en una tablet parada, 3 o 4', () => {
    expect(columnasPara(800, true)).toBe(3);
    expect(columnasPara(1024, true)).toBe(4);
  });

  it('en una tablet acostada, hasta 5', () => {
    expect(columnasPara(1280, true)).toBe(5);
    expect(columnasPara(2560, true)).toBe(5);
  });

  it('las tarjetas de una fila llenan el ancho, con sus márgenes y separaciones', () => {
    const ancho = 1280;
    const n = columnasPara(ancho, true);
    expect(anchoDeCelda(ancho, n) * n + 12 * (n - 1) + 32).toBeCloseTo(ancho);
  });
});
