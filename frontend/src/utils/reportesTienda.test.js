import { describe, it, expect } from 'vitest';
import {
  construirInventario, construirResumenTienda, etiquetaDeSerie, resumenDeLaTienda, resumenDelInventario,
} from './reportesTienda';

/*
 * Los reportes del tablero con el formato del reporte predictivo: el
 * resumen en palabras y que el PDF salga completo, con el encabezado de la
 * tienda. Los datos tienen la forma de GET /dashboard/summary e inventario.
 */

const RESUMEN = {
  pedidosHoy: { valor: 5, variacion: 25 },
  entregados: { valor: 2, variacion: -82 },
  ingresos: { valor: 42.5, delta: 10 },
  inversion: { valor: 30, delta: 5 },
  ganancia: { valor: 12.5, delta: 5, margen: 29.4 },
  ticketPromedio: 8.5,
  porReponer: { total: 1, lista: [{ name: 'Leche Entera', stock: 2, maxQuantity: 30, salePrice: 1.5 }] },
  porCaducar: { total: 2, lista: [{ name: 'Yogur', expirationDate: '2026-10-18T00:00:00.000Z', stock: 6 }, { name: 'Pan', stock: 3 }] },
  pedidosPorPreparar: 3,
  impresionesPendientes: 0,
  clientesNuevos: 1,
  puntosCanjeados: 120,
  descuentoPorPuntos: 1.2,
  totalProductos: 31,
  totalClientes: 12,
  masVendidos: [
    { nombre: 'Leche Entera', vendidos: 27, stock: 26, precio: 8.3 },
    { nombre: 'Queso Parmesano', vendidos: 27, stock: 20, precio: 6 },
    { nombre: 'Fresas', vendidos: 26, stock: 32, precio: 2.5 },
    { nombre: 'Coca-Cola', vendidos: 21, stock: 96, precio: 1.25 },
  ],
  sinMovimiento: [{ name: 'Dr Pepper', stock: 97, salePrice: 3.1 }],
  ventasPorModulo: [{ modulo: 'Tienda', total: 1324.05 }, { modulo: 'Panadería', total: 25.15 }],
  ventasSinModulo: 0,
  grafica: [
    { etiqueta: '2026-09', ventas: 950.25, compras: 0 },
    { etiqueta: '2026-10', ventas: 442.45, compras: 746.25 },
  ],
  umbrales: { diasCaduca: 7 },
};

const TIENDA = { nombre: 'Tienda la 635', direccion: 'Calle Sevilla 635', nit: '0614-010190-101-3' };

describe('el resumen de la tienda', () => {
  it('cuenta el día, el periodo, lo más vendido y lo que requiere atención', () => {
    const texto = resumenDeLaTienda(RESUMEN, 'mes').join('\n');
    expect(texto).toContain('Hoy van 5 pedidos (25% más que ayer) e ingresos por $42.50 ($10.00 más que ayer).');
    expect(texto).toContain('La ganancia real de hoy es $12.50, con un margen de 29.4%.');
    expect(texto).toContain('En los últimos 6 meses, las ventas suman $1,392.70 y las compras a proveedores $746.25: una diferencia de $646.45.');
    expect(texto).toContain('Lo más vendido: Leche Entera (27), Queso Parmesano (27), Fresas (26).');
    expect(texto).toContain('Requiere atención: 3 pedidos por preparar, 1 producto por reponer y 2 lotes por caducar.');
    expect(texto).toContain('1 cliente nuevo en los últimos 7 días, de 12 activos.');
    expect(texto).toContain('Sin ventas desde que están en la tienda: Dr Pepper.');
  });

  it('con todo en cero no dice "0 pedidos, igual que ayer"', () => {
    const quieto = {
      ...RESUMEN,
      pedidosHoy: { valor: 0, variacion: 0 }, ingresos: { valor: 0, delta: 0 }, ganancia: { valor: 0, delta: 0, margen: 0 },
      pedidosPorPreparar: 0, porReponer: { total: 0, lista: [] }, porCaducar: { total: 0, lista: [] }, clientesNuevos: 0,
    };
    const texto = resumenDeLaTienda(quieto, 'semana').join('\n');
    expect(texto).toContain('Hoy todavía no hay pedidos ni ventas cobradas.');
    expect(texto).not.toContain('0 pedidos');
    expect(texto).toContain('No hay pedidos esperando ni productos por reponer o por caducar.');
    expect(texto).toContain('Ningún cliente nuevo en los últimos 7 días; hay 12 activos.');
  });

  it('las etiquetas de la gráfica se escriben como fechas', () => {
    expect(etiquetaDeSerie('06/10')).toBe('6 oct');
    expect(etiquetaDeSerie('2026-09')).toBe('sep 2026');
    expect(etiquetaDeSerie('otra cosa')).toBe('otra cosa');
  });

  it('el PDF sale completo, con el encabezado de la tienda y sus secciones', () => {
    const doc = construirResumenTienda(RESUMEN, 'mes', TIENDA, new Date('2026-10-14T16:15:00Z'));
    const contenido = doc.output();
    for (const texto of ['TIENDA LA 635', 'RESUMEN DE LA TIENDA', 'NIT 0614-010190-101-3', 'Indicadores',
      'Ventas y compras', 'Productos m', 'Ventas por m', 'Productos por reponer', 'Lotes por caducar', 'Productos sin movimiento']) {
      expect(contenido).toContain(texto);
    }
  });

  it('sin gráfica ni listas también sale', () => {
    const vacio = { ...RESUMEN, grafica: [], masVendidos: [], ventasPorModulo: [], sinMovimiento: [], porReponer: { total: 0, lista: [] }, porCaducar: { total: 0, lista: [] } };
    expect(() => construirResumenTienda(vacio, 'semana', TIENDA)).not.toThrow();
  });
});

const INVENTARIO = [
  { name: 'Sandía', typeId: { type: 'Frutas' }, brandId: { name: 'Del Campo' }, moduleId: { name: 'Tienda' }, salePrice: 8, priceCost: 5, stock: 89 },
  { name: 'Agua', typeId: { type: 'Bebidas' }, brandId: { name: 'BebidasMax' }, moduleId: { name: 'Tienda' }, salePrice: 1.25, priceCost: 0.75, stock: '120' },
  { name: 'Queso', typeId: { type: 'Lácteos' }, salePrice: 4, priceCost: 4.5, stock: 0, unidadVenta: 'libra' },
  { name: 'Semita', typeId: { type: 'Panadería' }, salePrice: 1, stock: 10 },
];

describe('el inventario completo', () => {
  it('dice cuánto vale, qué está agotado y qué se vende sin ganancia', () => {
    const texto = resumenDelInventario(INVENTARIO).join('\n');
    expect(texto).toContain('4 productos activos; 1 se vende por libra.');
    expect(texto).toContain('El inventario vale $535.00 a costo y $872.00 a precio de venta: $337.00 de ganancia si se vendiera todo.');
    expect(texto).toContain('1 producto está sin existencia: Queso.');
    expect(texto).toContain('1 producto se vende a su costo o por debajo: Queso.');
    expect(texto).toContain('1 producto no tiene costo registrado');
  });

  it('el PDF va en horizontal, por categoría, con margen y valor a costo', () => {
    const doc = construirInventario(INVENTARIO, TIENDA, new Date('2026-10-14T16:15:00Z'));
    expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(doc.internal.pageSize.getHeight());
    const contenido = doc.output();
    expect(contenido).toContain('INVENTARIO COMPLETO');
    expect(contenido).toContain('Valor a costo');
    // Bebidas antes que Frutas: por categoría.
    expect(contenido.indexOf('(Agua)')).toBeLessThan(contenido.indexOf('(Sand'));
  });
});
