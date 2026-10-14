import { describe, it, expect } from 'vitest';
import { difuminadoDelFondo, puntoEnDiagonal } from './temasPromo';

/*
 * El color con que se funde la foto de una promo contra su fondo: tiene que
 * ser el del degradado en ese punto, no el último color a secas.
 */

describe('el difuminado de la foto de una promo', () => {
  it('mezcla los dos colores del fondo en el punto pedido', () => {
    expect(difuminadoDelFondo(['#000000', '#FFFFFF'], 0)).toEqual(['rgba(0,0,0,1)', 'rgba(0,0,0,0)']);
    expect(difuminadoDelFondo(['#000000', '#FFFFFF'], 1)).toEqual(['rgba(255,255,255,1)', 'rgba(255,255,255,0)']);
    expect(difuminadoDelFondo(['#C2410C', '#F08400'], 0.5)[0]).toBe('rgba(217,99,6,1)');
  });

  it('acepta colores cortos y no se rompe con uno que no es hexadecimal', () => {
    expect(difuminadoDelFondo(['#000', '#fff'], 1)[0]).toBe('rgba(255,255,255,1)');
    expect(difuminadoDelFondo(['red', 'blue'], 0.5)).toEqual(['blue', 'transparent']);
  });

  it('ubica un punto sobre la diagonal de una caja ancha', () => {
    expect(puntoEnDiagonal(0, 0, 2.2)).toBe(0);
    expect(puntoEnDiagonal(1, 1, 2.2)).toBeCloseTo(1);
    // En una tarjeta ancha manda más el lado que el alto.
    expect(puntoEnDiagonal(0.54, 0.5, 2.2)).toBeCloseTo(0.533, 2);
  });
});
