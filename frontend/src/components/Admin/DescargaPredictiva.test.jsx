// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import DescargaPredictiva from './DescargaPredictiva';
import { dashboardService } from '../../api/dashboardService';
import { descargarArchivo } from '../../utils/descargar';
import { construirReportePredictivo } from '../../utils/reportePredictivo';
import toast from 'react-hot-toast';

/*
 * El botón del reporte predictivo: pide el pronóstico, arma el PDF con los
 * datos de la tienda y lo descarga. El servidor y el PDF son de mentira.
 */

vi.mock('../../api/dashboardService', () => ({ dashboardService: { getPronostico: vi.fn() } }));
vi.mock('../../utils/descargar', () => ({ descargarArchivo: vi.fn() }));
// Solo el PDF es de mentira: la regla de las 4 semanas (pronosticoParaMostrar) es la de verdad.
vi.mock('../../utils/reportePredictivo', async (importOriginal) => ({
  ...(await importOriginal()),
  construirReportePredictivo: vi.fn(),
}));
vi.mock('react-hot-toast', () => {
  const toast = vi.fn();
  toast.error = vi.fn();
  return { default: toast };
});
vi.mock('../../context/AjustesContext', () => ({
  useAjustesCtx: () => ({
    ajustes: { nombreLinea1: 'Tienda', nombreLinea2: 'la 635', direccion: 'Calle Sevilla 635', logoUrl: '', negocio: { telefono: '2222-0635', nit: '0614', nrc: '' } },
  }),
}));

describe('descargar el reporte predictivo', () => {
  beforeEach(() => {
    construirReportePredictivo.mockReturnValue({ output: () => new Blob(['%PDF']) });
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('pide el pronóstico y descarga el PDF con los datos de la tienda', async () => {
    dashboardService.getPronostico.mockResolvedValue({ productos: [] });
    const alTerminar = vi.fn();
    render(<DescargaPredictiva alTerminar={alTerminar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Descargar reporte predictivo' }));

    expect(await screen.findByRole('status')).toBeTruthy(); // "puede tardar hasta un minuto"
    await waitFor(() => expect(descargarArchivo).toHaveBeenCalled());
    const [, tienda] = construirReportePredictivo.mock.calls[0];
    expect(tienda).toMatchObject({ nombre: 'Tienda la 635', telefono: '2222-0635', nit: '0614', logo: null });
    expect(descargarArchivo.mock.calls[0][1]).toMatch(/^reporte-predictivo-la635-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(alTerminar).toHaveBeenCalled();
  });

  it('si la tienda real no junta 4 semanas, descarga el de la demostración', async () => {
    dashboardService.getPronostico.mockImplementation(async ({ demo } = {}) =>
      demo ? { demo: true, productos: [], tienda: { periodo_anterior: 900 } } : { demoDisponible: true, productos: [], tienda: { periodo_anterior: null } });
    render(<DescargaPredictiva />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(descargarArchivo).toHaveBeenCalled());
    expect(dashboardService.getPronostico).toHaveBeenLastCalledWith({ forzar: false, demo: true });
    expect(descargarArchivo.mock.calls[0][1]).toMatch(/^reporte-predictivo-demostracion-la635-/);
  });

  it('sin ventas todavía, avisa y no descarga nada', async () => {
    dashboardService.getPronostico.mockResolvedValue({ vacio: true });
    render(<DescargaPredictiva />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(descargarArchivo).not.toHaveBeenCalled();
  });

  it('si el servidor dice qué pasó, lo muestra tal cual', async () => {
    dashboardService.getPronostico.mockRejectedValue({ response: { data: { message: 'El pronóstico todavía no está conectado.' } } });
    render(<DescargaPredictiva />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('El pronóstico todavía no está conectado.'));
    expect(screen.getByRole('button').disabled).toBe(false);
  });
});
