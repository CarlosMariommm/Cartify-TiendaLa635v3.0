import { describe, it, expect } from 'vitest';
import { animoDeFrase } from './animoTiqui';

// El ánimo de las frases fijas de Tiqui en la app: el mismo que en la web
// (frontend/src/utils/animoTiqui.test.js).
describe('el ánimo de las frases fijas', () => {
  it('cerrar la compra la emociona y agregar la alegra', () => {
    expect(animoDeFrase('¡Listo! Te abro el pago para que elijas cómo recibirlo y cómo pagar.')).toBe('emocionada');
    expect(animoDeFrase('Te agregué 2 Manzanas. ¿Algo más?')).toBe('alegre');
  });

  it('si se le corta o no entiende duda, y si no hay algo se apena', () => {
    expect(animoDeFrase('Perdón, se me cortó la conexión. ¿Me lo repites?')).toBe('dudosa');
    expect(animoDeFrase('No tienes Pera en el carrito.')).toBe('apenada');
  });

  it('lo demás, normal', () => {
    expect(animoDeFrase('Te muestro Bebidas.')).toBe('normal');
  });
});
