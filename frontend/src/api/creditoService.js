import api from './api';

// SERVICIO DE CRÉDITO CON PROVEEDORES — creditoService.js La deuda sale de los movimientos; acá
// solo se piden y se registran.
export const creditoService = {
  // Resumen de todos (listado y aviso del dashboard).
  getResumen: async () => {
    const response = await api.get('/credito');
    return response.data;
  },
  // Estado de cuenta de un proveedor: deuda, facturas pendientes y vencidas.
  getCuenta: async (supplierId) => {
    const response = await api.get(`/credito/${supplierId}`);
    return response.data;
  },
  registrarMovimiento: async (datos) => {
    const response = await api.post('/credito/movimiento', datos);
    return response.data;
  },
  borrarMovimiento: async (id) => {
    const response = await api.delete(`/credito/movimiento/${id}`);
    return response.data;
  },
  actualizarLimite: async (supplierId, datos) => {
    const response = await api.put(`/credito/${supplierId}`, datos);
    return response.data;
  },
};
