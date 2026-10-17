import api from './api';

// SERVICIO DE MARCAS — brandService.js
// Centraliza las peticiones HTTP del módulo de marcas (brands). Las marcas se envían como JSON
// simple.
export const brandService = {
  // 1- Obtener todas las marcas disponibles (SELECT)
  getBrands: async () => {
    const response = await api.get('/brand');
    return response.data;
  },

  // 2- Crear una nueva marca (INSERT)
  createBrand: async (brandData) => {
    const response = await api.post('/brand', brandData);
    return response.data;
  },

  // 3- Actualizar una marca existente por su ID (UPDATE)
  updateBrand: async (id, brandData) => {
    const response = await api.put(`/brand/${id}`, brandData);
    return response.data;
  },

  // 4- Eliminar una marca por su ID (DELETE)
  deleteBrand: async (id) => {
    const response = await api.delete(`/brand/${id}`);
    return response.data;
  }
};
