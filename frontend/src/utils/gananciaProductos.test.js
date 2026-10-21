import { describe, expect, it } from 'vitest';
import { gananciaDeProducto, resumenDeGanancias, ORDENES_GANANCIA } from './gananciaProductos';

// Cuánto deja cada producto, por unidad y con todo lo de bodega.
describe('ganancia por producto', () => {
  const coca = gananciaDeProducto({ _id: 'c', name: 'Coca-Cola', salePrice: 1.25, priceCost: 0.75, stock: 20 });
  const queso = gananciaDeProducto({ _id: 'q', name: 'Queso', salePrice: 4.75, priceCost: '3.80', stock: 10, unidadVenta: 'libra' });
  const perdida = gananciaDeProducto({ _id: 'p', name: 'Pan', salePrice: 0.4, priceCost: 0.5, stock: 6 });
  const sinCosto = gananciaDeProducto({ _id: 's', name: 'Semita', salePrice: 0.45, stock: 8 });

  it('por unidad, margen y con todo el stock', () => {
    expect(coca.porUnidad).toBeCloseTo(0.5);
    expect(coca.margen).toBeCloseTo(0.4);
    expect(coca.delStock).toBeCloseTo(10);
    expect(queso.porLibra).toBe(true);
    expect(queso.delStock).toBeCloseTo(9.5);
  });

  it('marca la pérdida y lo que no tiene costo', () => {
    expect(perdida.porUnidad).toBeCloseTo(-0.1);
    expect(sinCosto.sinCosto).toBe(true);
    expect(sinCosto.delStock).toBeNull();
  });

  it('los totales dejan fuera lo que no tiene costo', () => {
    const r = resumenDeGanancias([coca, queso, perdida, sinCosto]);
    expect(r.invertido).toBeCloseTo(15 + 38 + 3);
    expect(r.valorVenta).toBeCloseTo(25 + 47.5 + 2.4);
    expect(r.ganancia).toBeCloseTo(10 + 9.5 - 0.6);
    expect(r.conPerdida).toBe(1);
    expect(r.sinCosto).toBe(1);
  });

  it('ordena por ganancia del stock con lo que no tiene costo al final', () => {
    const orden = [sinCosto, perdida, queso, coca].sort(ORDENES_GANANCIA['ganancia-stock']).map((f) => f.id);
    expect(orden).toEqual(['c', 'q', 'p', 's']);
  });
});
