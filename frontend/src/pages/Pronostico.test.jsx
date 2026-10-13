// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Pronostico from './Pronostico';
import { dashboardService } from '../api/dashboardService';
import { descargarReportePredictivo } from '../utils/descargarPredictivo';

/*
 * La pantalla Pronóstico del panel. El servidor (y el servicio de análisis
 * detrás) son de mentira; la gráfica no se dibuja en jsdom, pero lo demás sí.
 */

vi.mock('../api/dashboardService', () => ({ dashboardService: { getPronostico: vi.fn() } }));
vi.mock('../utils/descargarPredictivo', () => ({ descargarReportePredictivo: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));
const AJUSTES = { nombreLinea1: 'Tienda', nombreLinea2: 'la 635' };
vi.mock('../context/AjustesContext', () => ({ useAjustesCtx: () => ({ ajustes: AJUSTES }) }));
vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ palette: { colors: { primary: '#003049', textMuted: '#adb5bd', cardBorder: '#e9ecef', cardBg: '#fff', textPrimary: '#111', textSecondary: '#666' } } }),
}));

const producto = (extra) => ({
  id: extra.id, nombre: extra.nombre, unidad: 'unidad', stock: 10, vendido: 20, dias_con_venta: 8, al_por_mayor: 0,
  confianza: 'alta', semana: { esperado: 4.6, bajo: 1.2, alto: 8.7 }, periodo: { esperado: 18.3, bajo: 9.4, alto: 27.1 },
  se_acaba: { agotado: false, probable: null, pronto: null }, ciclo_dias: 7, pedir: 0, costo_pedido: 0, ...extra,
});

const PRONOSTICO = {
  generado: '2026-10-14T16:00:00Z',
  historial: { dias: 43, pedidos: 120, semanas: [{ desde: '2026-10-07', hasta: '2026-10-13', total: 280 }] },
  perfil_semana: [1, 1, 1, 1, 1, 1, 1],
  tienda: {
    metodo: 'holt-winters',
    dias: Array.from({ length: 28 }, () => ({})),
    semanas: [{ desde: '2026-10-14', hasta: '2026-10-20', esperado: 300, bajo: 220, alto: 390 }],
    periodo: { esperado: 1200, bajo: 1010, alto: 1420 },
    periodo_anterior: 1120,
  },
  productos: [
    producto({ id: 'a', nombre: 'Lays Barbacoa', stock: 0, se_acaba: { agotado: true }, pedir: 12, costo_pedido: 7.2 }),
    producto({ id: 'b', nombre: 'Queso Crema', se_acaba: { agotado: false, probable: '2026-10-17', pronto: '2026-10-15' } }),
    producto({ id: 'c', nombre: 'Agua', confianza: 'baja', pedir: null, periodo: { esperado: 40, bajo: 0, alto: 90 } }),
  ],
  productos_sin_ventas: 0,
  proveedores: [{
    id: 's1', nombre: 'Distribuidora La Constancia', ciclo_dias: 7, costo_total: 7.2,
    productos: [{ id: 'a', nombre: 'Lays Barbacoa', unidad: 'unidad', stock: 0, pedir: 12, costo_pedido: 7.2 }],
  }],
  precision: { probado: true, semanas: 3, tienda: { error: 0.14, error_ingenuo: 0.23 }, productos: { error: 0.5, error_ingenuo: 0.6 } },
};

const abrir = () => render(<MemoryRouter><Pronostico /></MemoryRouter>);

describe('la pantalla Pronóstico', () => {
  beforeEach(() => dashboardService.getPronostico.mockResolvedValue(PRONOSTICO));
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('mientras calcula avisa que puede tardar, y después muestra todo', async () => {
    abrir();
    expect(screen.getByRole('status').textContent).toContain('puede tardar hasta un minuto');
    expect(await screen.findByText('$1,200.00')).toBeTruthy();
    expect(screen.getByText('entre $1,010.00 y $1,420.00')).toBeTruthy();
    expect(screen.getByText(/Se proyectan ventas por \$1,200\.00/)).toBeTruthy();
    expect(screen.getByText('Ya agotado')).toBeTruthy();
    expect(screen.getByText('17 de octubre de 2026')).toBeTruthy();
    expect(screen.getByText('Distribuidora La Constancia')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Cómo leerlo' }).getAttribute('href')).toBe('/ayuda?tema=pronostico');
  });

  it('la tabla por producto va de lo que más se vende a lo que menos, y se puede buscar', async () => {
    abrir();
    await screen.findByText('Pronóstico por producto');
    const tabla = screen.getAllByRole('table').at(-1);
    const filas = within(tabla).getAllByRole('row').slice(1).map((f) => f.cells[0].textContent);
    expect(filas).toEqual(['Agua', 'Lays Barbacoa', 'Queso Crema']);

    fireEvent.change(screen.getByLabelText('Buscar producto'), { target: { value: 'queso' } });
    expect(within(tabla).getAllByRole('row').slice(1).map((f) => f.cells[0].textContent)).toEqual(['Queso Crema']);
  });

  it('"Actualizar" lo vuelve a calcular y "Descargar PDF" usa el que ya tiene', async () => {
    abrir();
    await screen.findByText('$1,200.00');
    fireEvent.click(screen.getByRole('button', { name: /Actualizar/ }));
    await waitFor(() => expect(dashboardService.getPronostico).toHaveBeenLastCalledWith({ forzar: true, demo: false }));

    fireEvent.click(screen.getByRole('button', { name: /Descargar PDF/ }));
    await waitFor(() => expect(descargarReportePredictivo).toHaveBeenCalledWith(PRONOSTICO, AJUSTES));
    expect(dashboardService.getPronostico).toHaveBeenCalledTimes(2);
  });

  it('si el servidor dice qué pasó, lo muestra y deja reintentar', async () => {
    dashboardService.getPronostico.mockRejectedValueOnce({ response: { data: { message: 'El pronóstico todavía no está conectado.' } } });
    abrir();
    expect(await screen.findByText('El pronóstico todavía no está conectado.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('$1,200.00')).toBeTruthy();
  });

  it('sin ventas todavía lo dice, y no deja descargar', async () => {
    dashboardService.getPronostico.mockResolvedValue({ vacio: true, generado: '2026-10-14T16:00:00Z' });
    abrir();
    expect(await screen.findByText('Todavía no hay ventas de las que aprender.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Descargar PDF/ }).disabled).toBe(true);
  });
});

describe('la demostración en la pantalla Pronóstico', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('si el servidor la tiene, se puede cambiar a ella y lo dice claro', async () => {
    dashboardService.getPronostico.mockImplementation(async ({ demo }) => ({ ...PRONOSTICO, demoDisponible: true, ...(demo ? { demo: true } : {}) }));
    abrir();
    await screen.findByText('$1,200.00');
    expect(screen.getByRole('tab', { name: 'Tienda real' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByText(/Está viendo una demostración/)).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Demostración' }));
    await waitFor(() => expect(dashboardService.getPronostico).toHaveBeenLastCalledWith({ forzar: false, demo: true }));
    expect(await screen.findByText(/Está viendo una demostración/)).toBeTruthy();

    // El PDF sale de lo que se está viendo: la demostración.
    fireEvent.click(await screen.findByRole('button', { name: /Descargar PDF/ }));
    await waitFor(() => expect(descargarReportePredictivo).toHaveBeenCalledWith(expect.objectContaining({ demo: true }), AJUSTES));
  });

  it('sin demostración en el servidor, no se ofrece', async () => {
    dashboardService.getPronostico.mockResolvedValue({ ...PRONOSTICO, demoDisponible: false });
    abrir();
    await screen.findByText('$1,200.00');
    expect(screen.queryByRole('tab', { name: 'Demostración' })).toBeNull();
  });
});
