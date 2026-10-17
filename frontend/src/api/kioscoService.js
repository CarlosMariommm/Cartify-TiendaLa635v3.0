import api from './api';

// SERVICIO DEL KIOSCO — kioscoService.js
// El puente entre la pantalla del kiosco y el teléfono del cliente. La contraseña nunca pasa por
// aquí: el kiosco solo maneja un código de seis caracteres que muere en diez minutos.
export const kioscoService = {
  // El kiosco abre una sesión y recibe el código que va dentro del QR.
  crearSesion: async () => {
    const response = await api.post('/kiosco/sesion', {});
    return response.data;
  },

  // ¿Ya la escanearon? Se consulta cada pocos segundos mientras el QR está
  // en pantalla.
  verSesion: async (codigo) => {
    const response = await api.get(`/kiosco/sesion/${codigo}`);
    return response.data;
  },

  // El teléfono del cliente reclama la sesión (ahí sí hay sesión iniciada).
  vincular: async (codigo, clientId) => {
    const response = await api.put(`/kiosco/sesion/${codigo}`, { clientId });
    return response.data;
  },

  // Ya se cobró: el mismo QR no vuelve a servir.
  cerrar: async (codigo) => {
    const response = await api.put(`/kiosco/sesion/${codigo}/cerrar`, {});
    return response.data;
  },
};
