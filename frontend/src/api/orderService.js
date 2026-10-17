import api from './api';

// SERVICIO DE PEDIDOS — orderService.js
// Centraliza las peticiones HTTP de los pedidos de cliente (el modelo Order del backend). Lo usan
// los hooks del área cliente (Mis Pedidos) y la pantalla del empleado.
export const orderService = {
  // Pedidos de UN cliente (su historial) — para "Mis Pedidos" / "Recibidos".
  getMyOrders: async (clientId) => {
    const response = await api.get(`/order/client/${clientId}`);
    return response.data;
  },

  // UN pedido completo (pantalla de estado del pedido). El backend comprueba
  // que sea del cliente que pregunta.
  getOrderById: async (id) => {
    const response = await api.get(`/order/${id}`);
    return response.data;
  },

  // TODOS los pedidos (pantalla del empleado). status opcional: 'pagado', etc.
  getAllOrders: async (status) => {
    const response = await api.get('/order', {
      params: status ? { status } : {},
    });
    return response.data;
  },

  // Crear un pedido (checkout). data = { clientId, items, paymentMethod?, channel? }
  createOrder: async (data) => {
    const response = await api.post('/order', data);
    return response.data;
  },

  // Cambiar el estado de un pedido (preparando, entregado, cancelado). `quien` deja constancia de
  // quién movió el pedido (lo sella el servidor).
  updateStatus: async (id, status, quien, extras = {}) => {
    const response = await api.put(`/order/${id}/status`, { status, quien, ...extras });
    return response.data;
  },

  // El cliente cancela SU pedido, solo mientras está por preparar. Devuelve el pedido ya cancelado
  // (con lo que se le devolvió en `reembolso`). Ver orderController.cancelarPorCliente.
  cancelarPorCliente: async (id, motivo) => {
    const response = await api.patch(`/order/${id}/cancelar`, { motivo });
    return response.data;
  },

  // El cliente valora el SERVICIO de entrega de su pedido entregado (1-5 estrellas).
  rateService: async (id, { rating, comment }) => {
    const response = await api.patch(`/order/${id}/rating`, { rating, comment });
    return response.data;
  },

  // Seguimiento en vivo: dónde va el repartidor de un pedido (lo escribe la app, aquí solo se lee).
  // Se consulta cada pocos segundos, por eso el servidor devuelve solo el punto.
  getCourierPosition: async (id) => {
    const response = await api.get(`/order/${id}/courier`);
    return response.data;
  },

  // Cuánto tardamos de verdad en llegar a un punto, según las entregas ya hechas por esa zona.
  // Devuelve { hayDatos, entregas, tipico, holgado }.
  getTiempoPorZona: async (lat, lng) => {
    const response = await api.get('/order/tiempo-zona', { params: { lat, lng } });
    return response.data;
  },

  // Crear un pedido de IMPRESIÓN (lleva archivo → FormData).
  createPrintOrder: async (formData) => {
    const response = await api.post('/order/print', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
