/*
 * ============================================================
 * EL PERSONAL DE LA TIENDA — personalApi.js
 * ============================================================
 * Lo que habla la app cuando entra alguien del personal: su inicio de sesión
 * (el mismo del panel web, con el código que llega al correo), Tiqui del panel
 * (/api/tiqui-panel, solo el administrador) y el Reparto (los pedidos a
 * domicilio, moverlos de estado y mandar la ubicación del repartidor).
 *
 * Tiqui del panel es OTRA asistente que la de la tienda (asistenteApi): no
 * comparten sesión ni charla.
 *
 * El token del personal va en cada llamada, a mano, y NO se instala como el
 * token de la app (establecerToken): ese es el del cliente, y mezclarlos haría
 * que la tienda hablara con el servidor como si fuera el dueño.
 * ============================================================
 */

import { peticion, URL_API } from './api';

const conToken = (token) => ({ Authorization: `Bearer ${token}` });

/*
 * Por qué no se pudo: 'sesion' cierra el modo personal; 'lento' es el servidor
 * de Render despertándose (se duerme sin tráfico y la primera pregunta puede
 * tardar medio minuto), que no es culpa del internet.
 */
export const origenDe = (error) =>
  error?.estado === 401 ? 'sesion'
    : error?.estado === 429 ? 'tope'
    : error?.estado === 0 && /tard/.test(error?.message || '') ? 'lento'
    : 'sin-red';

// Lo que se le aguanta al servidor: si está despertando, tarda más que la IA.
const ESPERA_MS = 30000;

export const personalApi = {
  // ── Entrar ──

  /*
   * Paso 1: correo y contraseña. El servidor manda un código al correo y, como
   * la app no guarda cookies como el navegador, devuelve el token del paso 2
   * (`app: true`). Ese token no trae el código, solo su huella.
   */
  entrar: ({ email, password }) =>
    peticion('/loginAdmin/login', { metodo: 'POST', cuerpo: { email, password, app: true }, tiempoMaximo: 45000 }),

  // Paso 2: el código del correo. Devuelve { token, tipo: 'admin'|'employee', admin }.
  verificar: ({ code, twofaToken }) =>
    peticion('/loginAdmin/verify-2fa', { metodo: 'POST', cuerpo: { code, twofaToken } }),

  /*
   * Al salir se le pide al servidor que borre la cookie de sesión del personal
   * que el teléfono guardó al entrar: si se quedara, la tienda la seguiría
   * mandando en cada llamada. Va también el token de avisos del teléfono, para
   * que dejen de sonarle los pedidos nuevos (no pide sesión: si ya venció, la
   * baja igual pasa).
   */
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

  // ── Tiqui del panel (solo el administrador) ──

  despertar: async (token) => {
    try {
      const datos = await peticion('/tiqui-panel/listo', { cabeceras: conToken(token), tiempoMaximo: 45000 });
      return { voz: Boolean(datos?.voz) };
    } catch (error) {
      return { voz: false, origen: origenDe(error) };
    }
  },

  // pantalla 'app': el servidor sabe que aquí no hay pantallas del panel que abrir.
  conversar: async (token, { frase, historial }) => {
    try {
      return await peticion('/tiqui-panel', {
        metodo: 'POST',
        cuerpo: { frase, historial, pantalla: 'app' },
        cabeceras: conToken(token),
        tiempoMaximo: ESPERA_MS,
      });
    } catch (error) {
      return { acciones: [], respuesta: '', entendido: false, origen: origenDe(error) };
    }
  },

  confirmar: async (token, propuesta) => {
    try {
      return await peticion('/tiqui-panel/confirmar', {
        metodo: 'POST',
        cuerpo: { token: propuesta },
        cabeceras: conToken(token),
        tiempoMaximo: ESPERA_MS,
      });
    } catch (error) {
      return { ok: false, respuesta: '', origen: origenDe(error) };
    }
  },

  // La voz es la misma de la tienda: convertir texto en audio no sabe de ninguna asistente.
  urlVoz: (texto) => `${URL_API}/ai/voz?t=${encodeURIComponent(texto)}`,

  // ── El panel web dentro de la app (solo el administrador) ──

  /*
   * Un pase de un solo uso (vence en un minuto) para abrir el panel ya con la
   * sesión puesta, sin volver a pedir contraseña ni código. Ver PanelWeb.js.
   */
  paseDelPanel: (token) =>
    peticion('/loginAdmin/pase-app', { metodo: 'POST', cabeceras: conToken(token), tiempoMaximo: 45000 }),

  // ── Reparto ──

  // Todos los pedidos (la misma lista del panel); el Reparto se queda con los de domicilio.
  pedidos: (token) => peticion('/order', { cabeceras: conToken(token), tiempoMaximo: ESPERA_MS }),

  /*
   * Mover un pedido: el mismo PUT que el botón de Pedidos del panel. `extras`
   * lleva el código de entrega que dicta el cliente (o la omisión razonada).
   */
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
