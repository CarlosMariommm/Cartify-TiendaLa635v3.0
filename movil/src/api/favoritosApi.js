// FAVORITOS — favoritosApi.js
// Trae la lista de favoritos del cliente y marca o desmarca uno (el PATCH es un interruptor),
// con las mismas rutas que la web.

import { peticion } from './api';

export const getFavoritos = (clienteId) => peticion(`/client/${clienteId}/favorites`);

export const alternarFavorito = (clienteId, productoId) =>
  peticion(`/client/${clienteId}/favorites`, {
    metodo: 'PATCH',
    cuerpo: { productId: productoId },
  });
