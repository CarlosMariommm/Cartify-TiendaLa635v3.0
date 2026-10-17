import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { disfrazDeTema, sinSombrero } from './disfracesTiqui';
import { TEMAS_DE_TEMPORADA } from './temporadas';

// Tiqui se viste igual en la app y en la web: las piezas y la lógica del disfraz son los MISMOS
// archivos copiados (las pruebas de fondo están en frontend/src/utils/disfracesTiqui.test.js). Si
// alguien cambia uno y no el otro, esta prueba lo dice.
const leer = (ruta) => readFileSync(fileURLToPath(new URL(ruta, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

describe('los disfraces de Tiqui en la app', () => {
  it('las piezas y la lógica son las mismas que en la web', () => {
    for (const archivo of ['piezasDisfraz.js', 'disfracesTiqui.js']) {
      expect(leer(`./${archivo}`), archivo).toBe(leer(`../../../frontend/src/utils/${archivo}`));
    }
  });

  it('con los colores de la paleta de la app', () => {
    const navidad = TEMAS_DE_TEMPORADA.find((t) => t.clave === 'navidad');
    expect(disfrazDeTema(navidad).cabeza.tipo).toBe('gorro-navidad');
    expect(sinSombrero(disfrazDeTema(navidad)).cuello.tipo).toBe('bufanda');

    // Una propia: la app nombra sus colores `marca` y `acento`.
    const propia = { clave: 'propia-x', propio: true, colores: { marca: '#123456', acento: '#ABCDEF' }, decoracion: { figura: 'estrella' } };
    expect(disfrazDeTema(propia).cabeza).toEqual({ tipo: 'gorro-estrella', principal: '#123456', acento: '#ABCDEF' });
  });

  it('el que armó el dueño gana', () => {
    const navidad = TEMAS_DE_TEMPORADA.find((t) => t.clave === 'navidad');
    const disfraces = { navidad: { cuello: { tipo: 'medalla', principal: '#0F47AF', acento: '#FFC23D' } } };
    const puesto = disfrazDeTema(navidad, disfraces);
    expect(puesto.cabeza).toBeNull();
    expect(puesto.cuello.tipo).toBe('medalla');
  });
});
