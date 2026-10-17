// EL PERSONAL DE LA TIENDA — personalApi.js
// Las llamadas del modo personal: iniciar sesión (con el código del correo), el pase al panel web
// y el Reparto (pedidos a domicilio, moverlos de estado y mandar la ubicación).

import { peticion } from './api';

const conToken = (token) => ({ Authorization: `Bearer ${token}` });

// Lo que se le aguanta al servidor: si está despertando, puede tardar medio minuto.
const ESPERA_MS = 30000;

export const personalApi = {
  // ── Entrar ──

  // Paso 1: correo y contraseña. El servidor manda un código al correo y, como la app no guarda
  // cookies como el navegador, devuelve el token del paso 2 (`app: true`). Ese token no trae el
  // código, solo su huella.
  entrar: ({ email, password }) =>
    peticion('/loginAdmin/login', { metodo: 'POST', cuerpo: { email, password, app: true }, tiempoMaximo: 45000 }),

  // Paso 2: el código del correo. Devuelve { token, tipo: 'admin'|'employee', admin }.
  verificar: ({ code, twofaToken }) =>
    peticion('/loginAdmin/verify-2fa', { metodo: 'POST', cuerpo: { code, twofaToken } }),

  // Al salir se le pide al servidor que borre la cookie de sesión del personal que el teléfono
  // guardó al entrar: si se quedara, la tienda la seguiría mandando en cada llamada.
  salir: (tokenAvisos) =>
    peticion('/logoutAdmin', { metodo: 'POST', cuerpo: tokenAvisos ? { pushToken: tokenAvisos } : undefined })
      .catch(() => null),

  // Este teléfono avisa de cada pedido nuevo mientras dure la sesión.
  apuntarTelefono: (token, tokenAvisos) =>
    peticion('/perfil/avisos', {
      metodo: 'PUT',
      cuerpo: { token: tokenAvisos },
      cabeceras: conToken(token),
      tiempoMaximo: 45000,
    }),

  // ── El panel web dentro de la app (solo el administrador) ──

  // Un pase de un solo uso (vence en un minuto) para abrir el panel ya con la sesión puesta, sin
  // volver a pedir contraseña ni código. Ver PanelWeb.js.
  paseDelPanel: (token) =>
    peticion('/loginAdmin/pase-app', { metodo: 'POST', cabeceras: conToken(token), tiempoMaximo: 45000 }),

  // ── Reparto ──

  // Todos los pedidos (la misma lista del panel); el Reparto se queda con los de domicilio.
  pedidos: (token) => peticion('/order', { cabeceras: conToken(token), tiempoMaximo: ESPERA_MS }),

  // Mover un pedido: el mismo PUT que el botón de Pedidos del panel. `extras` lleva el código de
  // entrega que dicta el cliente (o la omisión razonada).
  avanzar: (token, pedidoId, status, quien, extras = {}) =>
    peticion(`/order/${pedidoId}/status`, {
      metodo: 'PUT',
      cuerpo: { status, quien, ...extras },
      cabeceras: conToken(token),
      tiempoMaximo: ESPERA_MS,
    }),

  // Dónde va el repartidor ({ lat, lng, quien }) o dejar de compartir ({ activo: false }).
  ubicacion: (token, pedidoId, datos) =>
    peticion(`/order/${pedidoId}/courier`, { metodo: 'PUT', cuerpo: datos, cabeceras: conToken(token) }),
};

export default personalApi;
