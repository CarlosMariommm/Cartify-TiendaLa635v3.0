import { describe, it, expect } from 'vitest';
import { formatoCodigoTarjeta, LARGO_CODIGO_TARJETA } from './tarjetaRegalo';

/*
 * Los guiones del código de una tarjeta de regalo se ponen solos.
 * (La app tiene la misma prueba sobre su copia.)
 */

describe('el código de una tarjeta de regalo', () => {
  it('pone los guiones mientras se escribe, sin dejar uno colgando', () => {
    const tecleado = '635A7K2M9QX'.split('').reduce((acc, letra) => [...acc, formatoCodigoTarjeta((acc.at(-1) || '') + letra)], []);
    expect(tecleado).toEqual([
      '6', '63', '635', '635-A', '635-A7', '635-A7K', '635-A7K2', '635-A7K2-M', '635-A7K2-M9', '635-A7K2-M9Q', '635-A7K2-M9QX',
    ]);
    expect(formatoCodigoTarjeta('635-A7K2-M9QX')).toHaveLength(LARGO_CODIGO_TARJETA);
  });

  it('al borrar, el guion se va con la letra', () => {
    expect(formatoCodigoTarjeta('635-')).toBe('635');
    expect(formatoCodigoTarjeta('635-A7K2-')).toBe('635-A7K2');
  });

  it('acepta minúsculas, espacios y guiones de más, y no pasa del largo', () => {
    expect(formatoCodigoTarjeta('635 a7k2 m9qx')).toBe('635-A7K2-M9QX');
    expect(formatoCodigoTarjeta('635--a7k2--m9qx')).toBe('635-A7K2-M9QX');
    expect(formatoCodigoTarjeta('635-A7K2-M9QXZZZ')).toBe('635-A7K2-M9QX');
  });

  it('sin el 635 del principio, lo agrega', () => {
    expect(formatoCodigoTarjeta('A7K2M9QX')).toBe('635-A7K2-M9QX');
    expect(formatoCodigoTarjeta('6A')).toBe('635-6A');
    expect(formatoCodigoTarjeta('')).toBe('');
  });
});
