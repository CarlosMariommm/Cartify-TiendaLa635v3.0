import { describe, it, expect } from 'vitest';
import { distanciaEnAnillo, indiceEnAnillo, ordenarAnuncios, poseEnAnillo } from './anillo';

// El anillo de promociones de la app: el mismo orden y el mismo giro que el carrusel de la web
// (usePromoCarousel.js).

describe('el anillo de promociones', () => {
  it('pone las más nuevas primero y solo nueve', () => {
    const promos = Array.from({ length: 12 }, (_, i) => ({
      _id: `p${i}`,
      createdAt: `2026-10-${String(i + 1).padStart(2, '0')}`,
    }));
    const anuncio = ordenarAnuncios(promos);
    expect(anuncio).toHaveLength(9);
    expect(anuncio[0]._id).toBe('p11');
    expect(anuncio[8]._id).toBe('p3');
    expect(promos[0]._id).toBe('p0'); // no toca la lista original
    expect(ordenarAnuncios(null)).toEqual([]);
  });

  it('mide la distancia al centro por el camino más corto, como la web', () => {
    // Con 5 promos y la 0 al frente, la 4 está a la izquierda (-1), no a +4.
    expect([0, 1, 2, 3, 4].map((i) => distanciaEnAnillo(i, 0, 5))).toEqual([0, 1, 2, -2, -1]);
    // Después de dar una vuelta entera, todo vuelve a su lugar.
    expect(distanciaEnAnillo(1, 5, 5)).toBe(1);
    expect(distanciaEnAnillo(4, -1, 5)).toBe(0);
    // Con dos, la otra espera a la derecha.
    expect(distanciaEnAnillo(1, 0, 2)).toBe(1);
  });

  it('a medio deslizar, la distancia corre sin saltos', () => {
    expect(distanciaEnAnillo(1, 0.25, 5)).toBeCloseTo(0.75);
    expect(distanciaEnAnillo(0, 0.25, 5)).toBeCloseTo(-0.25);
  });

  it('el índice real sale de cualquier paso, aunque sea negativo', () => {
    expect(indiceEnAnillo(7, 5)).toBe(2);
    expect(indiceEnAnillo(-1, 5)).toBe(4);
    expect(indiceEnAnillo(3, 0)).toBe(0);
  });

  it('la del centro va de frente y las de los lados giran hacia adentro', () => {
    const centro = poseEnAnillo(0);
    expect(centro).toMatchObject({ x: 0, giro: 0, escala: 1, opacidad: 1 });
    const derecha = poseEnAnillo(1);
    expect(derecha.giro).toBe(42);
    expect(derecha.x).toBeGreaterThan(0);
    expect(derecha.escala).toBeLessThan(1);
    expect(derecha.opacidad).toBeCloseTo(0.65);
    expect(poseEnAnillo(-1).giro).toBe(-42);
    // La que da la vuelta por detrás no se ve.
    expect(poseEnAnillo(1.5).opacidad).toBeCloseTo(0);
    expect(poseEnAnillo(3).opacidad).toBe(0);
    expect(poseEnAnillo(1, { sinGiro: true }).giro).toBe(0);
  });
});
