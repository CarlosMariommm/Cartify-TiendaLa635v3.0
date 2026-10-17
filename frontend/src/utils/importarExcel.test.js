import { describe, it, expect } from 'vitest';
import { aProductos, buscarEncabezado, faltaLoEsencial, leerCsv, leerNumero, mapearColumnas, PLANTILLA_CSV } from './importarExcel';

// Leer el Excel del inventario: qué columna es cuál, los números como se escriben aquí y las filas
// como productos.

describe('qué columna es cuál', () => {
  it('por los títulos de siempre, sin confundir el costo con el precio', () => {
    expect(mapearColumnas(['Código', 'Producto', 'P. Compra', 'Precio de venta', 'Existencia', 'Marca', 'Proveedor', 'U/M']))
      .toEqual({ codigo: 0, nombre: 1, costo: 2, precio: 3, existencia: 4, marca: 5, proveedor: 6, unidad: 7 });
    expect(mapearColumnas(['Nombre', 'Precio de compra', 'Precio unitario', 'Stock', 'Categoría', 'Fecha de vencimiento']))
      .toEqual({ nombre: 0, costo: 1, precio: 2, existencia: 3, categoria: 4, vence: 5 });
  });

  it('si no hay columna de nombre, la descripción hace de nombre', () => {
    expect(mapearColumnas(['Descripción', 'PVP', 'Cant.'])).toEqual({ nombre: 0, precio: 1, existencia: 2 });
    expect(mapearColumnas(['Producto', 'Descripción', 'Precio'])).toEqual({ nombre: 0, descripcion: 1, precio: 2 });
  });

  it('dice cuándo falta lo esencial (y entonces se le pregunta a la IA)', () => {
    expect(faltaLoEsencial(mapearColumnas(['Col1', 'Col2']))).toBe(true);
    expect(faltaLoEsencial(mapearColumnas(['Artículo', 'Valor']))).toBe(false);
  });

  it('el encabezado no siempre es la primera fila', () => {
    const filas = [['TIENDA LA 635', null], ['Inventario al 14/10/2026'], [], ['Producto', 'Precio'], ['Leche', 1.25]];
    expect(buscarEncabezado(filas)).toBe(3);
  });
});

describe('los números como se escriben aquí', () => {
  it.each([
    ['$1.25', 1.25], ['1,250.50', 1250.5], ['1,25', 1.25], ['1.250,50', 1250.5], ['1,250', 1250], [' 3 ', 3], [7, 7], ['', null], ['n/d', null],
  ])('%s → %s', (entrada, salida) => {
    expect(leerNumero(entrada)).toBe(salida);
  });
});

describe('las filas como productos', () => {
  it('con el número de fila del Excel, el código entero y sin filas vacías', () => {
    const filas = [
      ['Producto', 'Precio', 'Código', 'Vence'],
      ['Leche Entera', '$1.25', 7411001800231, new Date('2026-12-31T00:00:00Z')],
      [null, null, null, null],
      ['Queso duro', '3,50', '', '31/12/2026'],
      ['', '2.00', '', ''],
    ];
    const mapa = mapearColumnas(filas[0]);
    expect(aProductos(filas.slice(1), 1, mapa)).toEqual([
      expect.objectContaining({ fila: 2, nombre: 'Leche Entera', precio: 1.25, codigo: '7411001800231', vence: '2026-12-31' }),
      expect.objectContaining({ fila: 4, nombre: 'Queso duro', precio: 3.5, codigo: '', vence: '2026-12-31' }),
    ]);
  });
});

describe('el CSV', () => {
  it('con punto y coma (Excel en español) o con coma, y con comillas', () => {
    expect(leerCsv('Nombre;Precio\r\nLeche;1,25\r\n')).toEqual([['Nombre', 'Precio'], ['Leche', '1,25']]);
    expect(leerCsv('\uFEFFNombre,Precio\n"Galletas, 12 u",2.50\n"Dice ""hola""",1')).toEqual([['Nombre', 'Precio'], ['Galletas, 12 u', '2.50'], ['Dice "hola"', '1']]);
  });

  it('la plantilla se lee sola, con todas sus columnas', () => {
    const filas = leerCsv(PLANTILLA_CSV);
    const mapa = mapearColumnas(filas[0]);
    expect(Object.keys(mapa).sort()).toEqual(['categoria', 'codigo', 'costo', 'existencia', 'marca', 'nombre', 'precio', 'proveedor', 'unidad', 'vence']);
    expect(aProductos(filas.slice(1), 1, mapa)).toHaveLength(2);
  });
});
