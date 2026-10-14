import { describe, it, expect } from 'vitest';
import { aplicarFiltros, cuantosFiltros, enOferta, FILTROS_VACIOS, marcasDe } from './filtrosTienda';

/*
 * Los filtros de la tienda para el cliente: ordenar, precio, ofertas,
 * disponibles y marca. (La app tiene la misma prueba sobre su copia.)
 */

const PRODUCTOS = [
  { id: 'a', nombre: 'Leche', precio: 1.25, stock: 10, marca: 'Salud', creadoEn: '2026-10-01' },
  { id: 'b', nombre: 'Café', precio: 6.5, stock: 0, marca: 'Coscafé', precioAnterior: 7, creadoEn: '2026-10-10' },
  { id: 'c', nombre: 'Aceite', precio: 14, stock: 3, marca: 'Orisol', promo: { type: 'nxm' }, creadoEn: '2026-09-01' },
  { id: 'd', nombre: 'Pan', precio: 0.5, stock: 20, marca: '', promo: { type: 'anuncio' } },
];
const ids = (lista) => lista.map((p) => p.id);

describe('los filtros de la tienda', () => {
  it('sin filtros, la lista queda como la acomoda la tienda', () => {
    expect(ids(aplicarFiltros(PRODUCTOS))).toEqual(['a', 'b', 'c', 'd']);
    expect(cuantosFiltros(FILTROS_VACIOS)).toBe(0);
  });

  it('ordena por precio, por nombre (sin que la tilde estorbe) y por lo más nuevo', () => {
    expect(ids(aplicarFiltros(PRODUCTOS, { ...FILTROS_VACIOS, orden: 'precio-asc' }))).toEqual(['d', 'a', 'b', 'c']);
    expect(ids(aplicarFiltros(PRODUCTOS, { ...FILTROS_VACIOS, orden: 'precio-desc' }))).toEqual(['c', 'b', 'a', 'd']);
    expect(ids(aplicarFiltros(PRODUCTOS, { ...FILTROS_VACIOS, orden: 'nombre' }))).toEqual(['c', 'b', 'a', 'd']);
    expect(ids(aplicarFiltros(PRODUCTOS, { ...FILTROS_VACIOS, orden: 'nuevos' }))).toEqual(['b', 'a', 'c', 'd']);
  });

  it('filtra por precio, ofertas, disponibles y marca, y los cuenta', () => {
    const f = { ...FILTROS_VACIOS, precio: '4-12' };
    expect(ids(aplicarFiltros(PRODUCTOS, f))).toEqual(['b']);
    expect(ids(aplicarFiltros(PRODUCTOS, { ...FILTROS_VACIOS, soloOferta: true }))).toEqual(['b', 'c']);
    expect(ids(aplicarFiltros(PRODUCTOS, { ...FILTROS_VACIOS, soloDisponibles: true }))).toEqual(['a', 'c', 'd']);
    expect(ids(aplicarFiltros(PRODUCTOS, { ...FILTROS_VACIOS, marca: 'Salud' }))).toEqual(['a']);
    const varios = { ...FILTROS_VACIOS, soloOferta: true, soloDisponibles: true, orden: 'precio-asc' };
    expect(ids(aplicarFiltros(PRODUCTOS, varios))).toEqual(['c']);
    expect(cuantosFiltros(varios)).toBe(2); // el orden no cuenta: no quita productos
  });

  it('un anuncio ("Nuevo") no es oferta; las marcas salen en orden y sin repetir', () => {
    expect(enOferta(PRODUCTOS[3])).toBe(false);
    expect(enOferta(PRODUCTOS[2])).toBe(true);
    expect(marcasDe([...PRODUCTOS, { marca: 'Salud' }])).toEqual(['Coscafé', 'Orisol', 'Salud']);
  });

  it('no toca la lista original', () => {
    const copia = PRODUCTOS.map((p) => p.id);
    aplicarFiltros(PRODUCTOS, { ...FILTROS_VACIOS, orden: 'precio-desc' });
    expect(ids(PRODUCTOS)).toEqual(copia);
  });
});
