import api from './api';

// SERVICIO DE LOYALTY — loyaltyService.js
// Lee y edita la configuración del programa de puntos (tasa de puntos por dólar y meses de
// vencimiento). La lectura la usa el cliente para su tarjeta; la edición, el admin.
export const loyaltyService = {
  // Config actual (tasa + vencimiento).
  getConfig: async () => {
    const response = await api.get('/loyaltyConfig');
    return response.data;
  },

  // Editar la config (solo admin). data = { pointsPerDollar?, expiryMonths?, isActive? }
  updateConfig: async (data) => {
    const response = await api.put('/loyaltyConfig', data);
    return response.data;
  },

  // Resumen de puntos del cliente: saldo disponible + vencimientos.
  getSummary: async (clientId) => {
    const response = await api.get(`/loyalty/${clientId}/summary`);
    return response.data;
  },
};
