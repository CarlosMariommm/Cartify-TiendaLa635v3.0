// CLIENTE HTTP — api.js
// El equivalente móvil de `frontend/src/api/api.js`, pero con `fetch` en vez de axios.

import { tAhora } from '../utils/idioma';
import { URL_WEB_LEGAL } from '../utils/legales';

const HOST_MANUAL = null;

const HOST_RENDER = 'https://cartify-tiendala635.onrender.com/api';

export const URL_API = HOST_MANUAL || HOST_RENDER;

// La web del panel, que el administrador abre dentro de la app (pages/personal/PanelWeb.js). Si
// HOST_MANUAL apunta a un backend local, aquí va la web que habla con ESE backend: el pase con el
// que se abre el panel solo lo reconoce el servidor que lo dio.
const WEB_MANUAL = null;

export const URL_WEB = WEB_MANUAL || URL_WEB_LEGAL;

// El token de sesión vigente, para mandarlo por Authorization en cada petición.
let tokenActual = null;

export const establecerToken = (token) => {
  tokenActual = token;
};

// Un error que ya trae el mensaje que va a leer el cliente.
export class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
  }
}

const RESPALDO_POR_ESTADO = {
  400: 'Revisa los datos e intenta de nuevo',
  401: 'El correo o contraseña son incorrectos',
  403: 'No tienes permiso para hacer esto',
  404: 'No encontramos lo que buscabas',
  500: 'Error interno del servidor',
};

// Una petición al backend. Devuelve el JSON ya parseado, o lanza un ErrorApi con el mensaje del
// servidor.
export const peticion = async (ruta, { metodo = 'GET', cuerpo, cabeceras, tiempoMaximo } = {}) => {
  let respuesta;

  // Un FormData (la foto de perfil) va tal cual: ni se convierte a JSON ni se
  // le pone Content-Type a mano, que si no fetch no agrega el boundary del
  // multipart y el backend no puede separar los campos.
  const esFormData = cuerpo instanceof FormData;

  // `tiempoMaximo` (ms), para lo que no puede quedarse esperando para siempre: el asistente de voz
  // tiene a alguien parado mirando el teléfono. fetch no trae tope propio, así que se corta a mano.
  const corte = tiempoMaximo ? new AbortController() : null;
  const reloj = corte ? setTimeout(() => corte.abort(), tiempoMaximo) : null;

  try {
    respuesta = await fetch(`${URL_API}${ruta}`, {
      method: metodo,
      headers: {
        Accept: 'application/json',
        ...(cuerpo && !esFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(tokenActual ? { Authorization: `Bearer ${tokenActual}` } : {}),
        ...cabeceras,
      },
      body: esFormData ? cuerpo : cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: corte?.signal,
    });
  } catch {
    throw new ErrorApi(
      corte?.signal.aborted
        ? tAhora('El servidor tardó demasiado en contestar.')
        : tAhora('No pudimos conectarnos con la tienda. Revisa tu conexión e inténtalo otra vez.', { url: URL_API }),
      0
    );
  } finally {
    if (reloj) clearTimeout(reloj);
  }

  // Un 500 puede devolver HTML en vez de JSON; que eso no tumbe la pantalla.
  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    datos = null;
  }

  if (!respuesta.ok) {
    // El servidor escribe en español. En inglés se traduce con el mismo diccionario de la web (que ya
    // trae sus mensajes); lo que no esté ahí sale tal cual. En el modo del personal tAhora es siempre
    // español.
    const mensaje = tAhora(
      datos?.message || RESPALDO_POR_ESTADO[respuesta.status] || 'Ocurrió un error inesperado'
    );
    const error = new ErrorApi(mensaje, respuesta.status);
    // El resto del cuerpo viaja pegado al error (p.ej.
    if (datos && typeof datos === 'object') Object.assign(error, datos, { message: mensaje });
    throw error;
  }

  return datos;
};

export default peticion;
