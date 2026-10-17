import api from './api';

// SERVICIO DEL CLIENTE (área "Mi Cuenta") — clientService.js
// Peticiones del cliente sobre SU propia cuenta (perfil, puntos). Distinto de customerService.js,
// que es la vista del ADMIN sobre todos los clientes.
export const clientService = {
  // Traer un cliente por id (incluye loyaltyPoints; sin la contraseña).
  getClientById: async (id) => {
    const response = await api.get(`/client/${id}`);
    return response.data;
  },

  // El cliente actualiza SUS datos básicos (nombre, usuario, correo, teléfono).
  updateProfile: async (id, data) => {
    const response = await api.patch(`/client/${id}/profile`, data);
    return response.data;
  },

  // El cliente sube/reemplaza su foto de perfil. Va por el endpoint con multipart (PUT /client/:id),
  // que exige también nombre, teléfono, correo y usuario: por eso el formData debe traerlos junto
  // con 'image'.
  actualizarConFoto: async (id, formData) => {
    const response = await api.put(`/client/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // El cliente reemplaza su lista de direcciones (arreglo de strings).
  // Favoritos del cliente (el corazón de las tarjetas de producto).
  getFavorites: async (id) => {
    const response = await api.get(`/client/${id}/favorites`);
    return response.data;
  },

  toggleFavorite: async (id, productId) => {
    const response = await api.patch(`/client/${id}/favorites`, { productId });
    return response.data;
  },

  updateAddresses: async (id, addresses) => {
    const response = await api.patch(`/client/${id}/addresses`, { addresses });
    return response.data;
  },

  // El cliente actualiza sus preferencias de notificación.
  updateNotifications: async (id, prefs) => {
    const response = await api.patch(`/client/${id}/notifications`, prefs);
    return response.data;
  },

  // "Dejar de recibirlos", desde el pie de un correo. NO lleva id ni necesita sesión: la persona
  // puede estar en un teléfono donde nunca inició sesión, y pedirle la contraseña para dejar de
  // recibir correos que no pidió es la forma elegante de no dejarla salir.
  bajaNotificacion: async (token) => {
    const response = await api.post('/client/notificaciones/baja', { token });
    return response.data;
  },

  // El cliente reemplaza su lista de métodos de pago (datos no sensibles).
  updatePaymentMethods: async (id, paymentMethods) => {
    const response = await api.patch(`/client/${id}/payment-methods`, { paymentMethods });
    return response.data;
  },
};
