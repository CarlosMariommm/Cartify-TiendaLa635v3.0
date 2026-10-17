import api from './api';

// SERVICIO DE VALORACIONES — reviewService.js
// Lo que opinan los clientes de cada producto. Reemplaza a las reseñas inventadas que traía la
// ficha de producto.
export const reviewService = {
  // Valoraciones + resumen (promedio, total y reparto por estrella).
  getByProduct: async (productId) => {
    const response = await api.get(`/review/${productId}`);
    return response.data;
  },

  // Crea o actualiza la del cliente (el backend exige que lo haya comprado).
  guardar: async ({ productId, clientId, rating, comment }) => {
    const response = await api.post('/review', { productId, clientId, rating, comment });
    return response.data;
  },

  eliminar: async (productId, clientId) => {
    const response = await api.delete(`/review/${productId}`, { data: { clientId } });
    return response.data;
  },
};
