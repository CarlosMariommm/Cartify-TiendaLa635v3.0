import { describe, it, expect } from 'vitest';
import { coincide, fechaDeAlta, ordenarLista, ORDEN_INICIAL } from './listasPanel';

/*
 * Las listas del panel: lo más reciente primero, de entrada; y la búsqueda
 * sin tildes ni mayúsculas.
 */

// Un id de Mongo con la fecha adentro (los primeros 8 caracteres son los segundos).
const idDe = (iso) => `${Math.floor(Date.parse(iso) / 1000).toString(16)}0000000000000000`;

const LISTA = [
  { _id: idDe('2026-01-10T00:00:00Z'), name: 'Bebidas' },
  { _id: idDe('2026-03-01T00:00:00Z'), name: 'Ácaros' },
  { _id: idDe('2026-02-01T00:00:00Z'), name: 'Carnes', createdAt: '2026-10-01T00:00:00Z' },
];

describe('las listas del panel', () => {
  it('de entrada, lo más reciente primero (con su fecha o la de su id)', () => {
    expect(ORDEN_INICIAL).toBe('recientes');
    expect(ordenarLista(LISTA).map((x) => x.name)).toEqual(['Carnes', 'Ácaros', 'Bebidas']);
    expect(ordenarLista(LISTA, 'antiguos').map((x) => x.name)).toEqual(['Bebidas', 'Ácaros', 'Carnes']);
    expect(fechaDeAlta({ _id: 'no-es-un-id' })).toBe(0);
  });

  it('por nombre, sin que la tilde lo mande al final', () => {
    expect(ordenarLista(LISTA, 'nombre').map((x) => x.name)).toEqual(['Ácaros', 'Bebidas', 'Carnes']);
    expect(ordenarLista([{ type: 'Zinc' }, { type: 'arroz' }], 'nombre', { nombre: (x) => x.type }).map((x) => x.type)).toEqual(['arroz', 'Zinc']);
  });

  it('cada pantalla agrega sus órdenes, y la lista original no se toca', () => {
    const precios = [{ precio: 2 }, { precio: 5 }, { precio: 1 }];
    expect(ordenarLista(precios, 'caro', { extras: { caro: (a, b) => b.precio - a.precio } }).map((x) => x.precio)).toEqual([5, 2, 1]);
    expect(precios.map((x) => x.precio)).toEqual([2, 5, 1]);
    expect(ordenarLista(null)).toEqual([]);
  });

  it('busca sin tildes ni mayúsculas, en cualquiera de los campos', () => {
    expect(coincide('limon', 'Jugo de LIMÓN')).toBe(true);
    expect(coincide('ana', 'Pedro', null, 'ana@correo.com')).toBe(true);
    expect(coincide('xyz', 'Pedro')).toBe(false);
    expect(coincide('  ', 'lo que sea')).toBe(true);
  });
});
