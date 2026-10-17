import api from './api';

// SERVICIO DE FORMATOS DE IMPRESIÓN — printServiceService.js Catálogo de formatos (Carta, A4, DUI,
// Póster…) con su precio. JSON.
export const printServiceService = {
  getServices: async () => (await api.get('/printService')).data,
  createService: async (data) => (await api.post('/printService', data)).data,
  updateService: async (id, data) => (await api.put(`/printService/${id}`, data)).data,
  deleteService: async (id) => (await api.delete(`/printService/${id}`)).data,
};
