import { describe, it, expect } from 'vitest';
import { cantidad, construirReportePredictivo, rango, resumenDelPronostico } from './reportePredictivo';
import { dinero, fechaLarga, pasoRedondo, rangoDeFechas } from './reportesPdf';

/*
 * El reporte predictivo con un pronóstico de ejemplo, con la forma que
 * devuelve el servicio de analítica (analitica/app/pronostico.py).
 */

const producto = (extra) => ({
  id: 'p', nombre: 'Producto', unidad: 'unidad', proveedor: 's1', stock: 10, vendido: 20, dias_con_venta: 8,
  al_por_mayor: 0, confianza: 'alta', por_dia: 0.7,
  semana: { esperado: 4.6, bajo: 1.2, alto: 8.7 }, periodo: { esperado: 18.3, bajo: 9.4, alto: 27.1 },
  se_acaba: { agotado: false, probable: null, pronto: null }, ciclo_dias: 7, pedir: 0, costo_pedido: 0,
  ...extra,
});

const semanas = ['2026-10-14', '2026-10-21', '2026-10-28', '2026-11-04'];
const PRONOSTICO = {
  historial: {
    desde: '2026-09-01', hasta: '2026-10-13', dias: 43, pedidos: 120, ventas: 2400,
    semanas: semanas.map((_, i) => ({ desde: `2026-09-${16 + i * 7}`, hasta: `2026-09-${22 + i * 7}`, total: 280 })),
  },
  perfil_semana: [0.85, 0.8, 0.9, 1, 1.05, 1.25, 1.15],
  tienda: {
    metodo: 'holt-winters',
    nivel: 0.8,
    dias: Array.from({ length: 28 }, (_, i) => ({ dia: `2026-10-${String(14 + i).padStart(2, '0')}`.replace('2026-10-32', '2026-11-01'), esperado: 40, bajo: 20, alto: 60 })),
    semanas: semanas.map((d) => ({ desde: d, hasta: d, esperado: 300, bajo: 220, alto: 390 })),
    periodo: { esperado: 1200, bajo: 1010, alto: 1420 },
    periodo_anterior: 1120,
  },
  productos: [
    producto({ id: 'a', nombre: 'Lays Barbacoa', stock: 0, se_acaba: { agotado: true }, pedir: 12, costo_pedido: 7.2 }),
    producto({ id: 'b', nombre: 'Queso Crema', se_acaba: { agotado: false, probable: '2026-10-17', pronto: '2026-10-15' }, pedir: 6, costo_pedido: 9.3 }),
    producto({ id: 'c', nombre: 'Agua', confianza: 'baja', dias_con_venta: 1, pedir: null, al_por_mayor: 0 }),
  ],
  productos_sin_ventas: 1,
  proveedores: [{
    id: 's1', nombre: 'Distribuidora La Constancia', ciclo_dias: 7, costo_total: 16.5,
    productos: [{ id: 'a', nombre: 'Lays Barbacoa', unidad: 'unidad', stock: 0, pedir: 12, costo_pedido: 7.2 }, { id: 'b', nombre: 'Queso Crema', unidad: 'unidad', stock: 10, pedir: 6, costo_pedido: 9.3 }],
  }],
  precision: { probado: true, semanas: 3, tienda: { error: 0.142, error_ingenuo: 0.231 }, productos: { error: 0.49, error_ingenuo: 0.61 } },
};

const TIENDA = { nombre: 'Tienda la 635', direccion: 'Calle Sevilla 635', telefono: '2222-0635', nit: '0614-010190-101-3' };

describe('el resumen del pronóstico', () => {
  it('dice cuánto se vende, contra qué se compara y con qué rango', () => {
    const [ventas] = resumenDelPronostico(PRONOSTICO);
    expect(ventas).toBe('Se proyectan ventas por $1,200.00 en las próximas 4 semanas (entre $1,010.00 y $1,420.00, con 80% de probabilidad), un 7% más que las 4 semanas anteriores ($1,120.00).');
  });

  it('cuenta lo agotado, lo que se va a agotar, la compra y lo que no tiene base', () => {
    const texto = resumenDelPronostico(PRONOSTICO).join('\n');
    expect(texto).toContain('Ya está agotado: Lays Barbacoa.');
    expect(texto).toContain('Queso Crema se agotaría alrededor del 17 de octubre de 2026');
    expect(texto).toContain('suma $16.50: 2 productos con 1 proveedor.');
    expect(texto).toContain('1 producto tiene menos de 3 días con venta');
    expect(texto).toContain('El día más fuerte de la semana es el sábado (25% más que un día promedio) y el más flojo, el martes (20% menos).');
    expect(texto).toContain('error de 14% (repetir la semana anterior: 23%), y la de cada producto con 49% (repetir la semana anterior: 61%).');
  });

  it('con una sola semana de prueba, o sin prueba, se dice preliminar', () => {
    const unaSemana = { ...PRONOSTICO, precision: { ...PRONOSTICO.precision, semanas: 1 } };
    expect(resumenDelPronostico(unaSemana).at(-1)).toMatch(/^Pronóstico preliminar: se basa en 43 días de ventas \(120 pedidos\)/);
    const sinPrueba = { ...PRONOSTICO, precision: { probado: false, motivo: 'pocos días' } };
    expect(resumenDelPronostico(sinPrueba).at(-1)).toMatch(/^Pronóstico preliminar/);
  });

  it('sin compras sugeridas lo dice, y no inventa un patrón semanal plano', () => {
    const texto = resumenDelPronostico({ ...PRONOSTICO, proveedores: [], perfil_semana: [1, 1, 1, 1.05, 1, 0.95, 1] }).join('\n');
    expect(texto).toContain('no hace falta pedir nada');
    expect(texto).not.toContain('día más fuerte');
  });
});

describe('cómo se escriben los números', () => {
  it('dinero, fechas y cantidades', () => {
    expect(dinero(1021.3)).toBe('$1,021.30');
    expect(fechaLarga('2026-10-14')).toBe('14 de octubre de 2026');
    expect(rangoDeFechas('2026-10-14', '2026-11-10')).toBe('del 14 de octubre al 10 de noviembre de 2026');
    expect(rangoDeFechas('2026-12-28', '2027-01-24')).toBe('del 28 de diciembre de 2026 al 24 de enero de 2027');
    expect(cantidad(12)).toBe('12');
    expect(cantidad(3.84, 'unidad', { promedio: true })).toBe('3.8');
    expect(cantidad(3.5, 'libra')).toBe('3.5 lb');
    expect(rango(0.4, 8.7)).toBe('0 a 9');
    expect(rango(1.8, 8.9, 'libra')).toBe('1.8 a 8.9 lb');
  });

  it('las líneas de la gráfica caen en montos redondos', () => {
    expect(pasoRedondo(140)).toBe(200);
    expect(pasoRedondo(95)).toBe(100);
    expect(pasoRedondo(23)).toBe(25);
    expect(pasoRedondo(0)).toBe(1);
  });
});

describe('el PDF', () => {
  it('se arma completo, con el encabezado de la tienda', () => {
    const doc = construirReportePredictivo(PRONOSTICO, TIENDA, new Date('2026-10-14T16:00:00Z'));
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    const contenido = doc.output();
    for (const texto of ['TIENDA LA 635', 'REPORTE PREDICTIVO', 'NIT 0614-010190-101-3', 'Compra sugerida por proveedor', 'Distribuidora La Constancia', 'Confiabilidad y m']) {
      expect(contenido).toContain(texto);
    }
  });

  it('al lado de cada proveedor dice por dónde se le pide, si se sabe', () => {
    const conCanal = { ...PRONOSTICO, proveedores: [{ ...PRONOSTICO.proveedores[0], pedido: { canal: 'app', app: 'BEES' } }] };
    expect(construirReportePredictivo(conCanal, TIENDA).output()).toContain('se le pide por BEES');
    expect(construirReportePredictivo(PRONOSTICO, TIENDA).output()).not.toContain('se le pide por');
  });

  it('sin compras ni productos por agotarse también sale', () => {
    const tranquilo = { ...PRONOSTICO, proveedores: [], productos: [producto({})], precision: { probado: false, motivo: 'Hacen falta al menos 28 días.' } };
    expect(() => construirReportePredictivo(tranquilo, TIENDA)).not.toThrow();
  });
});

describe('el PDF de la demostración', () => {
  it('lo dice en el título y arriba, para que nadie lo tome por ventas reales', () => {
    const contenido = construirReportePredictivo({ ...PRONOSTICO, demo: true }, TIENDA).output();
    expect(contenido).toContain('REPORTE PREDICTIVO');
    expect(contenido).toContain('DEMOSTRACI');
    expect(contenido).toContain('ventas inventadas');
    expect(construirReportePredictivo(PRONOSTICO, TIENDA).output()).not.toContain('ventas inventadas');
  });
});
