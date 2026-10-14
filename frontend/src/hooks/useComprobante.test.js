// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useComprobante } from './useComprobante';
import { descargarArchivo } from '../utils/descargar';

/*
 * Bajar el comprobante desde Pedidos: se arma con el pedido en pantalla y los
 * datos de la tienda, y se baja con el nombre de siempre.
 */

vi.mock('../utils/descargar', () => ({ descargarArchivo: vi.fn() }));
vi.mock('../context/AjustesContext', () => ({ useAjustesCtx: () => ({ ajustes: { nombreLinea1: 'Tienda', nombreLinea2: 'la 635' } }) }));

const PEDIDO = {
  _id: '6a7f00000000000000a1b2c3', status: 'entregado', createdAt: '2026-10-14T21:45:00Z',
  items: [{ name: 'Leche Entera', price: 1.25, amount: 2 }], subtotal: 2.5, total: 2.5,
};

describe('el comprobante desde Pedidos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lo arma y lo baja con el número del pedido', async () => {
    const { result } = renderHook(() => useComprobante());
    let bien;
    await act(async () => { bien = await result.current.descargar(PEDIDO); });
    expect(bien).toBe(true);
    const [pdf, nombre] = descargarArchivo.mock.calls[0];
    expect(nombre).toBe('comprobante-pedido-A1B2C3.pdf');
    expect(pdf.type).toBe('application/pdf');
    expect(result.current.descargando).toBeNull();
  });

  it('si no se puede bajar, devuelve false y suelta el botón', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    descargarArchivo.mockRejectedValueOnce(new Error('sin red'));
    const { result } = renderHook(() => useComprobante());
    let bien;
    await act(async () => { bien = await result.current.descargar(PEDIDO); });
    expect(bien).toBe(false);
    expect(result.current.descargando).toBeNull();
  });
});
