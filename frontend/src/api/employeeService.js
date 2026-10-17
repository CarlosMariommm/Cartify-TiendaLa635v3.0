import api from './api';

// SERVICIO DE EMPLEADOS — employeeService.js
// Centraliza las peticiones HTTP del módulo de empleados. Al igual que productos, usa FormData
// para crear/actualizar porque los empleados pueden tener foto de perfil.
export const employeeService = {
  // 1- Obtener todos los empleados registrados (SELECT)
  getEmployees: async () => {
    const response = await api.get('/employee');
    return response.data;
  },

  // 2- Crear un nuevo empleado con foto de perfil (INSERT)
  createEmployee: async (formData) => {
    const response = await api.post('/employee', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // 3- Actualizar un empleado existente por su ID (UPDATE)
  updateEmployee: async (id, formData) => {
    const response = await api.put(`/employee/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // 4- Eliminar un empleado por su ID (DELETE)
  deleteEmployee: async (id) => {
    const response = await api.delete(`/employee/${id}`);
    return response.data;
  }
};
