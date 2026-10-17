import api from './api';

// SERVICIO DE MÓDULOS / PASILLOS — moduleService.js
// Centraliza las peticiones HTTP del módulo de pasillos o secciones de la tienda (modules). Se
// envían como JSON.
export const moduleService = {
  // 1- Obtener todos los módulos/pasillos (SELECT)
  getModules: async () => {
    const response = await api.get('/module');
    return response.data;
  },

  // 2- Crear un nuevo módulo/pasillo (INSERT)
  createModule: async (data) => {
    const response = await api.post('/module', data);
    return response.data;
  },

  // 3- Actualizar un módulo/pasillo existente por su ID (UPDATE)
  updateModule: async (id, data) => {
    const response = await api.put(`/module/${id}`, data);
    return response.data;
  },

  // 4- Eliminar un módulo/pasillo por su ID (DELETE)
  deleteModule: async (id) => {
    const response = await api.delete(`/module/${id}`);
    return response.data;
  }
};
