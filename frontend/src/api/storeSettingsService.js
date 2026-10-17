import api from './api';

// AJUSTES DE LA TIENDA — storeSettingsService.js
// Nombre, logo, orden de la portada y tema de temporada. Un solo documento para toda la tienda,
// así que no hay ids de por medio.
export const storeSettingsService = {
  getAjustes: async () => (await api.get('/storeSettings')).data,

  guardarAjustes: async (datos) => (await api.put('/storeSettings', datos)).data,

  subirLogo: async (archivo) => {
    const forma = new FormData();
    forma.append('logo', archivo);
    // El Content-Type va explícito: la instancia de axios trae 'application/json'
    // por defecto y sin pisarlo el archivo llega vacío al servidor.
    return (await api.put('/storeSettings/logo', forma, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data;
  },

  quitarLogo: async () => (await api.delete('/storeSettings/logo')).data,
};
