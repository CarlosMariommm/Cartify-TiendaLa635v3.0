import api from './api';

// SERVICIO DE PROVEEDORES — supplierService.js
// Centraliza las peticiones HTTP del módulo de proveedores. Los proveedores no llevan imagen, por
// lo que se envían como JSON normal (sin FormData).
export const supplierService = {
  // 1- Obtener todos los proveedores (SELECT)
  getSuppliers: async () => {
    const response = await api.get('/supplier');
    return response.data;
  },

  // 2- Crear un nuevo proveedor (INSERT)
  createSupplier: async (data) => {
    const response = await api.post('/supplier', data);
    return response.data;
  },

  // 3- Actualizar un proveedor existente por su ID (UPDATE)
  updateSupplier: async (id, data) => {
    const response = await api.put(`/supplier/${id}`, data);
    return response.data;
  },

  // 4- Eliminar un proveedor por su ID (DELETE)
  deleteSupplier: async (id) => {
    const response = await api.delete(`/supplier/${id}`);
    return response.data;
  }
};
