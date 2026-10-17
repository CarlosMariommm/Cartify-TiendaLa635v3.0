import api from './api';

// SERVICIO DEL DASHBOARD — dashboardService.js Una sola llamada trae todo el resumen del admin ya
// agregado por el backend.
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

  // El pronóstico del servicio de analítica (solo el administrador). `demo` usa la demostración.
  // Si el servidor contesta "calculando", se vuelve a preguntar cada pocos segundos hasta que esté;
  // `alcanza(datos)` deja de esperar cuando ya basta.
  getPronostico: async ({ forzar = false, demo = false } = {}, { cada = 4000, maximo = 6 * 60 * 1000, alcanza = null } = {}) => {
    const inicio = Date.now();
    let conForzar = forzar;
    for (;;) {
      const response = await api.get('/dashboard/pronostico', {
        params: { ...(conForzar ? { forzar: 1 } : {}), ...(demo ? { demo: 1 } : {}) },
        timeout: 120000,
      });
      if (!response.data?.calculando || alcanza?.(response.data)) return response.data;
      conForzar = false;
      if (Date.now() - inicio > maximo) {
        throw Object.assign(new Error('El pronóstico tarda demasiado'), {
          response: { data: { message: 'El pronóstico está tardando más de lo normal. Intente de nuevo en unos minutos.' } },
        });
      }
      await new Promise((listo) => setTimeout(listo, cada));
    }
  },
};
