// LA CUENTA DEL CLIENTE — clienteApi.js
// El equivalente de `frontend/src/api/clientService.js`: lo que un cliente hace sobre SU propia
// cuenta.

import { peticion } from './api';

export const getCliente = (clienteId) => peticion(`/client/${clienteId}`);

export const actualizarPerfil = (clienteId, campos) =>
  peticion(`/client/${clienteId}/profile`, { metodo: 'PATCH', cuerpo: campos });

// La foto va por el mismo endpoint que los datos de texto, pero como multipart: el backend solo
// mira los campos que vengan, así que mandar nada más que "image" no toca ni borra el nombre, el
// correo, etc.
export const actualizarFotoPerfil = (clienteId, foto) => {
  const cuerpo = new FormData();
  cuerpo.append('image', foto);
  return peticion(`/client/${clienteId}/profile`, { metodo: 'PATCH', cuerpo });
};

// Manda la lista COMPLETA, no la que cambió. Es como está hecho el endpoint — reemplaza el arreglo
// entero— así que borrar una dirección es mandar todas menos esa.
export const actualizarDirecciones = (clienteId, direcciones) =>
  peticion(`/client/${clienteId}/addresses`, {
    metodo: 'PATCH',
    cuerpo: { addresses: direcciones },
  });

// Aquí sí van solo las que cambiaron: el controlador las mezcla con las que ya
// estaban guardadas.
export const actualizarNotificaciones = (clienteId, preferencias) =>
  peticion(`/client/${clienteId}/notifications`, { metodo: 'PATCH', cuerpo: preferencias });

// A DÓNDE mandar los avisos, que es distinto de CUÁLES quiere (eso es lo de arriba). El token lo
// emite Expo y vale para esta instalación de la app: ver utils/notificaciones.js. `activo: false`
// al cerrar sesión.
export const registrarTokenPush = (clienteId, token, activo = true) =>
  peticion(`/client/${clienteId}/push-token`, {
    metodo: 'PATCH',
    cuerpo: { token, activo },
  });

// Igual que direcciones: la lista COMPLETA, no la que cambió. Y aunque se manden más campos, el
// controlador solo guarda type/alias/last4 —nunca el número completo ni el CVV, eso lo cobra la
// pasarela, que todavía no está conectada (ver Checkout.js)—.
export const actualizarMetodosPago = (clienteId, metodosPago) =>
  peticion(`/client/${clienteId}/payment-methods`, {
    metodo: 'PATCH',
    cuerpo: { paymentMethods: metodosPago },
  });
