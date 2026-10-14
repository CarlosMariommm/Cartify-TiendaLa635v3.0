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
  /*
   * Si el cálculo tarda (Render gratis con historia larga), el servidor
   * contesta "calculando" y lo sigue haciendo: aquí se vuelve a preguntar
   * cada pocos segundos hasta que esté. Solo la primera pregunta fuerza a
   * recalcular; las demás esperan ESE cálculo, no empiezan otro.
   */
  // `alcanza(datos)`: con un "calculando" que ya basta (ver pronosticoParaMostrar), se deja de esperar.
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
