import api from './api';

/*
 * SERVICIO DEL DASHBOARD — dashboardService.js
 * Una sola llamada trae todo el resumen del admin ya agregado por el backend.
 */
export const dashboardService = {
  // periodo: 'semana' | 'mes' | 'anio' (afecta la gráfica de ventas vs compras)
  getSummary: async (periodo = 'mes') => {
    const response = await api.get('/dashboard/summary', { params: { periodo } });
    return response.data;
  },

  // Solo la gráfica: se usa al cambiar Semana/Mes/Año, para no recargar todo.
  getChart: async (periodo = 'mes') => {
    const response = await api.get('/dashboard/chart', { params: { periodo } });
    return response.data;
  },

  /*
   * El pronóstico del servicio de analítica (solo el administrador). Con
   * espera larga: si el servicio estaba dormido en Render, despertar le toma
   * cerca de un minuto, y el servidor de la tienda lo espera hasta 90 s.
   */
  // `demo`: con la demostración (ventas inventadas de varios meses), no con la tienda real.
  getPronostico: async ({ forzar = false, demo = false } = {}) => {
    const response = await api.get('/dashboard/pronostico', {
      params: { ...(forzar ? { forzar: 1 } : {}), ...(demo ? { demo: 1 } : {}) },
      timeout: 120000,
    });
    return response.data;
  },
};
