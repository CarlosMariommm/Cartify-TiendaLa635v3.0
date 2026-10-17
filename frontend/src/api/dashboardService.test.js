import { describe, it, expect, vi, afterEach } from 'vitest';
import api from './api';
import { dashboardService } from './dashboardService';

// Pedir el pronóstico cuando el servidor todavía lo está calculando: se vuelve a preguntar hasta
// que esté, sin forzar otro cálculo cada vez.

vi.mock('./api', () => ({ default: { get: vi.fn() } }));

describe('pedir el pronóstico', () => {
  afterEach(() => vi.clearAllMocks());

  it('mientras dice "calculando", vuelve a preguntar; solo la primera vez fuerza', async () => {
    api.get
      .mockResolvedValueOnce({ data: { calculando: true } })
      .mockResolvedValueOnce({ data: { calculando: true } })
      .mockResolvedValueOnce({ data: { tienda: { periodo: {} } } });
    const datos = await dashboardService.getPronostico({ forzar: true, demo: true }, { cada: 1 });
    expect(datos).toEqual({ tienda: { periodo: {} } });
    expect(api.get).toHaveBeenCalledTimes(3);
    expect(api.get.mock.calls[0][1].params).toEqual({ forzar: 1, demo: 1 });
    expect(api.get.mock.calls[1][1].params).toEqual({ demo: 1 });
    expect(api.get.mock.calls[2][1].params).toEqual({ demo: 1 });
  });

  it('con un "calculando" que ya alcanza, deja de esperar', async () => {
    api.get.mockResolvedValue({ data: { calculando: true, faltanCuatroSemanas: true, demoDisponible: true } });
    const datos = await dashboardService.getPronostico({}, { cada: 1, alcanza: (d) => d.faltanCuatroSemanas });
    expect(datos.calculando).toBe(true);
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('si no termina nunca, se rinde con un mensaje claro', async () => {
    api.get.mockResolvedValue({ data: { calculando: true } });
    await expect(dashboardService.getPronostico({}, { cada: 1, maximo: 5 }))
      .rejects.toMatchObject({ response: { data: { message: expect.stringContaining('tardando más de lo normal') } } });
  });
});
