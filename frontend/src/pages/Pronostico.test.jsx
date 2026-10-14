// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Pronostico from './Pronostico';
import { dashboardService } from '../api/dashboardService';
import { descargarReportePredictivo } from '../utils/descargarPredictivo';
import toast from 'react-hot-toast';

/*
 * La pantalla Pronóstico del panel. El servidor (y el servicio de análisis
 * detrás) son de mentira; la gráfica no se dibuja en jsdom, pero lo demás sí.
 */

vi.mock('../api/dashboardService', () => ({ dashboardService: { getPronostico: vi.fn() } }));
vi.mock('../utils/descargarPredictivo', () => ({ descargarReportePredictivo: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
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
    expect(screen.getByRole('status').textContent).toContain('puede tardar un par de minutos');
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

  it('si la tienda real no junta 4 semanas, abre con la demostración y dice por qué', async () => {
    const corta = { ...PRONOSTICO, demoDisponible: true, tienda: { ...PRONOSTICO.tienda, periodo: { esperado: 90, bajo: 50, alto: 130 }, periodo_anterior: null } };
    dashboardService.getPronostico.mockImplementation(async ({ demo } = {}) => (demo ? { ...PRONOSTICO, demoDisponible: true, demo: true } : corta));
    abrir();
    expect(await screen.findByText('$1,200.00')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Demostración' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText(/todavía no junta 4 semanas de ventas/)).toBeTruthy();
    // La real y la demostración, una vez cada una: nada de pedidos de más.
    expect(dashboardService.getPronostico).toHaveBeenCalledTimes(2);

    // La tienda real sigue a un toque.
    fireEvent.click(screen.getByRole('tab', { name: 'Tienda real' }));
    expect(await screen.findByText('$90.00')).toBeTruthy();
    expect(dashboardService.getPronostico).toHaveBeenLastCalledWith({ forzar: false, demo: false });
  });

  it('sin demostración en el servidor, no se ofrece', async () => {
    dashboardService.getPronostico.mockResolvedValue({ ...PRONOSTICO, demoDisponible: false });
    abrir();
    await screen.findByText('$1,200.00');
    expect(screen.queryByRole('tab', { name: 'Demostración' })).toBeNull();
  });
});

describe('pedirle al proveedor desde la compra sugerida', () => {
  const conCanal = (pedido, extra = {}) => ({ ...PRONOSTICO, ...extra, proveedores: [{ ...PRONOSTICO.proveedores[0], pedido }] });
  afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

  it('por WhatsApp: abre el chat con el mensaje y la lista ya escritos', async () => {
    dashboardService.getPronostico.mockResolvedValue(conCanal({ canal: 'whatsapp', whatsapp: '70001111', app: '', enlace: '', telefono: '' }));
    abrir();
    const boton = await screen.findByRole('link', { name: /Pedir por WhatsApp/ });
    const enlace = new URL(boton.getAttribute('href'));
    expect(enlace.origin + enlace.pathname).toBe('https://wa.me/50370001111');
    expect(enlace.searchParams.get('text')).toBe('Buenos días. Le escribimos de Tienda la 635. Quisiéramos hacerle este pedido:\n• Lays Barbacoa: 12\nMuchas gracias.');
    expect(boton.getAttribute('target')).toBe('_blank');
  });

  it('en su app (BEES): la abre y deja la lista copiada para pegarla', async () => {
    const writeText = vi.fn().mockResolvedValue();
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    dashboardService.getPronostico.mockResolvedValue(conCanal({ canal: 'app', whatsapp: '', app: 'BEES', enlace: 'https://www.bees.com/', telefono: '' }));
    abrir();
    const boton = await screen.findByRole('link', { name: /Pedir en BEES/ });
    expect(boton.getAttribute('href')).toBe('https://www.bees.com/');
    fireEvent.click(boton);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Lista copiada: péguela en el pedido.'));
    expect(writeText).toHaveBeenCalledWith('• Lays Barbacoa: 12');
  });

  it('por llamada: marca su número, en la misma pestaña', async () => {
    dashboardService.getPronostico.mockResolvedValue(conCanal({ canal: 'llamada', whatsapp: '', app: '', enlace: '', telefono: '2222-3333' }));
    abrir();
    const boton = await screen.findByRole('link', { name: /Llamar al 2222-3333/ });
    expect(boton.getAttribute('href')).toBe('tel:22223333');
    expect(boton.getAttribute('target')).toBeNull();
  });

  it('sin canal, lleva a Proveedores; en la demostración, nada', async () => {
    dashboardService.getPronostico.mockResolvedValue(conCanal(null));
    abrir();
    expect((await screen.findByRole('link', { name: 'Indicar cómo se le pide' })).getAttribute('href')).toBe('/proveedores');
    cleanup();

    dashboardService.getPronostico.mockImplementation(async ({ demo }) => conCanal(null, { demoDisponible: true, ...(demo ? { demo: true } : {}) }));
    abrir();
    fireEvent.click(await screen.findByRole('tab', { name: 'Demostración' }));
    await screen.findByText(/Está viendo una demostración/);
    await screen.findByText('Distribuidora La Constancia');
    expect(screen.queryByRole('link', { name: 'Indicar cómo se le pide' })).toBeNull();
  });
});
