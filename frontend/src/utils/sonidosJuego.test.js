import { describe, it, expect } from 'vitest';
import * as sonidos from './sonidosJuego';

// Los sonidos del reto de Tiqui se generan con Web Audio, que aquí (jsdom) no existe, igual que en
// un navegador viejo. El juego tiene que seguir igual, en silencio: ninguno puede reventar.
describe('sonidos del juego sin Web Audio', () => {
  it('ningún efecto revienta', () => {
    for (const [nombre, fn] of Object.entries(sonidos)) {
      if (typeof fn !== 'function') continue;
      expect(() => fn(), nombre).not.toThrow();
    }
  });

  it('la música se pone, se baja y se calla sin reventar', () => {
    expect(() => {
      sonidos.tocarMusica('alegre');
      sonidos.bajarMusica(true);
      sonidos.tocarMusica('tension');
      sonidos.activarMusica(false);
      sonidos.tocarMusica(null);
    }).not.toThrow();
  });
});
