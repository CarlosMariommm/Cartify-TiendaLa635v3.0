import api from './api';

// SERVICIO DE GIFT CARDS — giftCardService.js El admin crea y anula tarjetas; el cliente canjea y
// consulta su saldo.
export const giftCardService = {
  getGiftCards: async () => {
    const response = await api.get('/giftCard');
    return response.data;
  },
  createGiftCards: async (datos) => {
    const response = await api.post('/giftCard', datos);
    return response.data;
  },
  deleteGiftCard: async (id) => {
    const response = await api.delete(`/giftCard/${id}`);
    return response.data;
  },
  redeem: async (code, clientId) => {
    const response = await api.post('/giftCard/redeem', { code, clientId });
    return response.data;
  },
  getBalance: async (clientId) => {
    const response = await api.get(`/giftCard/balance/${clientId}`);
    return response.data;
  },
};
