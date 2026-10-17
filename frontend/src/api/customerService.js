import api from './api';

// SERVICIO DE CLIENTES — customerService.js
// Centraliza las peticiones HTTP del módulo de clientes.
export const customerService = {
  // 1- Obtener todos los clientes registrados (SELECT)
  getCustomers: async () => {
    const response = await api.get('/registerClient/all');
    return response.data;
  },

  // 2- Eliminar un cliente (solo el administrador). Borra la cuenta y sus datos personales; sus
  // pedidos se quedan en la contabilidad sin nada que lo identifique. Con un pedido en curso, el
  // servidor responde 409. Ver backend/src/utils/eliminarCliente.js.
  deleteCustomer: async (id) => {
    const response = await api.delete(`/client/${id}`);
    return response.data;
  },
};
