import { describe, it, expect } from 'vitest';
import { animoDeFrase, caraDeAnimo } from './animoTiqui';

// El ánimo de las frases fijas de Tiqui, y la cara que pone con cada uno.
describe('el ánimo de las frases fijas', () => {
  it('cerrar la compra la emociona y agregar la alegra', () => {
    expect(animoDeFrase('¡Listo! Te abro el pago para que elijas cómo recibirlo y cómo pagar.')).toBe('emocionada');
    expect(animoDeFrase('Lleva tu carrito a caja y alguien de la tienda te ayuda a pagar.')).toBe('emocionada');
    expect(animoDeFrase('Te agregué 2 Manzanas. ¿Algo más?')).toBe('alegre');
  });

  it('si no entiende duda, y si no hay algo se apena', () => {
    expect(animoDeFrase('No te entendí bien. ¿Me lo repites?')).toBe('dudosa');
    expect(animoDeFrase('No encontré ese producto para quitarlo.')).toBe('apenada');
  });

  it('lo demás, normal', () => {
    expect(animoDeFrase('Te muestro Bebidas.')).toBe('normal');
    expect(animoDeFrase()).toBe('normal');
  });
});

describe('la cara con cada ánimo', () => {
  it('es la misma que ponía antes con esas frases', () => {
    expect(caraDeAnimo('emocionada')).toBe('feliz');
    expect(caraDeAnimo('alegre')).toBe('contento');
    expect(caraDeAnimo('dudosa')).toBe('confundido');
    expect(caraDeAnimo('apenada')).toBe('confundido');
  });

  it('los ánimos nuevos de la IA también tienen cara', () => {
    expect(caraDeAnimo('rie')).toBe('feliz');
    expect(caraDeAnimo('asombrada')).toBe('contento');
    expect(caraDeAnimo('normal')).toBe('normal');
    expect(caraDeAnimo(undefined)).toBe('normal');
  });
});
