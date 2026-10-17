import api from './api';

// SERVICIO DE PROMOCIONES — promotionService.js Crear/editar usan FormData porque la promo lleva
// una imagen (banner).
export const promotionService = {
  getPromotions: async () => {
    const response = await api.get('/promotion');
    return response.data;
  },
  createPromotion: async (formData) => {
    const response = await api.post('/promotion', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  updatePromotion: async (id, formData) => {
    const response = await api.put(`/promotion/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  deletePromotion: async (id) => {
    const response = await api.delete(`/promotion/${id}`);
    return response.data;
  },
};
