// VALORACIONES — valoracionesApi.js
// Las dos formas de calificar que ya tiene la web, y que aquí faltaban: PATCH /order/:id/rating el
// SERVICIO de entrega de ese pedido POST /review la reseña de un PRODUCTO

import { peticion } from './api';

// La estrella y el comentario del reparto. El backend acepta de 1 a 5 y recorta el comentario a
// 500 caracteres; se manda tal cual y él decide.
export const valorarServicio = (pedidoId, { rating, comment = '' }) =>
  peticion(`/order/${pedidoId}/rating`, {
    metodo: 'PATCH',
    cuerpo: { rating, comment },
  });

// La reseña de un producto. Es un "upsert": si el cliente ya había valorado ese producto, se
// actualiza en vez de duplicarse — igual que en la web.
export const guardarResena = ({ productId, clientId, rating, comment = '' }) =>
  peticion('/review', {
    metodo: 'POST',
    cuerpo: { productId, clientId, rating, comment },
  });
