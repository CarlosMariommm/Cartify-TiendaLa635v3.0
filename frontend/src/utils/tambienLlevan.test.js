import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cargarTambienLlevan, elegirTambienLlevan, olvidarTambienLlevan } from './tambienLlevan';
import { productService } from '../api/productService';

// "Quien compra esto también lleva" en la ficha de la web: lo que manda el servidor, cruzado con
// el catálogo que ya está cargado.

vi.mock('../api/productService', () => ({ productService: { getTambienLlevan: vi.fn() } }));

const CATALOGO = [
  { id: 'pan', nombre: 'Pan', stock: 10 },
  { id: 'leche', nombre: 'Leche', stock: 5 },
  { id: 'queso', nombre: 'Queso', stock: 0 },
  { id: 'cerveza', nombre: 'Cerveza', stock: 12, soloAdultos: true },
  { id: 'vino', nombre: 'Vino', stock: 3, soloAdultos: true },
  { id: 'jugo', nombre: 'Jugo', stock: 8 },
];
const de = (id) => CATALOGO.find((p) => p.id === id);

describe('qué sale en la ficha', () => {
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
  });
});

describe('la lista de la tienda', () => {
  beforeEach(() => {
    olvidarTambienLlevan();
    productService.getTambienLlevan.mockReset();
  });

  it('se pide una sola vez y la comparten todas las fichas', async () => {
    productService.getTambienLlevan.mockResolvedValue({ productos: { pan: ['leche'] } });
    const [a, b] = await Promise.all([cargarTambienLlevan(), cargarTambienLlevan()]);
    expect(a).toEqual({ pan: ['leche'] });
    expect(b).toBe(a);
    await cargarTambienLlevan();
    expect(productService.getTambienLlevan).toHaveBeenCalledTimes(1);
  });

  it('si falla, queda vacía y la próxima ficha lo vuelve a intentar', async () => {
    productService.getTambienLlevan.mockRejectedValueOnce(new Error('sin red')).mockResolvedValueOnce({ productos: { pan: ['jugo'] } });
    expect(await cargarTambienLlevan()).toEqual({});
    expect(await cargarTambienLlevan()).toEqual({ pan: ['jugo'] });
  });
});
