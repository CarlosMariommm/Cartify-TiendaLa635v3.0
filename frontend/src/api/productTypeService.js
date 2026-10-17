import api from './api';

// SERVICIO DE CATEGORÍAS (TIPOS DE PRODUCTO) — productTypeService.js
// Centraliza las peticiones HTTP del módulo de categorías. Cada categoría pertenece a un
// módulo/pasillo específico. Se envían como JSON simple.
export const productTypeService = {
  // 1- Obtener todas las categorías (SELECT)
  getProductTypes: async () => {
    const response = await api.get('/productType');
    return response.data;
  },

  // 2- Crear una nueva categoría (INSERT)
  createProductType: async (data) => {
    const response = await api.post('/productType', data);
    return response.data;
  },

  // 3- Actualizar una categoría existente por su ID (UPDATE)
  updateProductType: async (id, data) => {
    const response = await api.put(`/productType/${id}`, data);
    return response.data;
  },

  // 4- Eliminar una categoría por su ID (DELETE)
  deleteProductType: async (id) => {
    const response = await api.delete(`/productType/${id}`);
    return response.data;
  }
};
