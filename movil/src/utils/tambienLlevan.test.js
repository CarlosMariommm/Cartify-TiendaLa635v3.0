import { describe, it, expect } from 'vitest';
import { elegirTambienLlevan } from './tambienLlevan';

/*
 * Qué sale en "Quien compra esto también lleva" de la ficha: lo del servidor,
 * cruzado con el catálogo que ya tiene la app.
 */

const CATALOGO = [
  { id: 'pan', nombre: 'Pan', stock: 10 },
  { id: 'leche', nombre: 'Leche', stock: 5 },
  { id: 'queso', nombre: 'Queso', stock: 0 },
  { id: 'cerveza', nombre: 'Cerveza', stock: 12, soloAdultos: true },
  { id: 'vino', nombre: 'Vino', stock: 3, soloAdultos: true },
  { id: 'jugo', nombre: 'Jugo', stock: 8 },
];
const de = (id) => CATALOGO.find((p) => p.id === id);

describe('quien compra esto también lleva, en la app', () => {
  it('en el orden del servidor, sin agotados ni lo que ya no está en el catálogo', () => {
    expect(elegirTambienLlevan(['queso', 'leche', 'borrado', 'jugo'], CATALOGO, de('pan')).map((p) => p.id))
      .toEqual(['leche', 'jugo']);
  });

  it('nada +18 junto a un producto que no lo es; junto a uno +18, sí', () => {
    expect(elegirTambienLlevan(['cerveza', 'leche'], CATALOGO, de('pan')).map((p) => p.id)).toEqual(['leche']);
    expect(elegirTambienLlevan(['cerveza', 'pan'], CATALOGO, de('vino')).map((p) => p.id)).toEqual(['cerveza', 'pan']);
  });

  it('cinco como mucho, sin el que se está viendo, y nada si no hay lista', () => {
    const muchos = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, stock: 1 }));
    expect(elegirTambienLlevan(['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'], muchos, { id: 'p0' }).map((p) => p.id))
      .toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
    expect(elegirTambienLlevan(undefined, CATALOGO, de('pan'))).toEqual([]);
    expect(elegirTambienLlevan(['leche'], CATALOGO, null)).toEqual([]);
  });
});
