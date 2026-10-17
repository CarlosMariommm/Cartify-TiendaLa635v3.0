import api from './api';

// SERVICIO DE PERFIL — perfilService.js
// La foto de perfil del personal conectado (admin o empleado). El backend sabe de quién es por la
// sesión, así que aquí no se manda ningún id.
export const perfilService = {
  // Subir o reemplazar la foto. formData debe traer el archivo en 'image'.
  actualizarFoto: async (formData) => {
    const response = await api.put('/perfil/foto', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Quitar la foto y volver a las iniciales.
  quitarFoto: async () => {
    const response = await api.delete('/perfil/foto');
    return response.data;
  },
};
