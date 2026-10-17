import axios from 'axios';
import toast from 'react-hot-toast';
import { mensajeEnEspanol } from '../utils/mensajesBackend';
import { CAJON, areaDeRuta } from '../utils/sesion';
import { tAhora } from '../utils/idioma';

// CLIENTE AXIOS CENTRALIZADO — api.js
// Axios es una librería de JavaScript para hacer peticiones HTTP (como fetch, pero más potente).

// 1- Creamos la instancia de Axios con la configuración base `baseURL`: prefijo que se añade a
// todas las rutas.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// INTERCEPTORES DE RESPUESTA
// Revisan cada respuesta antes de que llegue al componente. Un 401 significa que la sesión venció
// o nunca existió: se cierra la sesión y se manda a entrar de nuevo.
let echandoSesion = false;

const cerrarSesionVencida = () => {
  // Varias peticiones fallan a la vez al vencer la sesión; una sola salida.
  if (echandoSesion) return;

  const area = areaDeRuta(window.location.pathname);

  // Si nunca hubo sesión en este cajón, el 401 es lo esperado —alguien mirando la tienda sin cuenta—
  // y no hay a quién echar. Sin esta guarda, un visitante anónimo terminaría en el login por
  // curiosear.
  if (!localStorage.getItem(CAJON[area])) {
    toast.error(tAhora('Inicia sesión para ver esto.'));
    return;
  }

  const puerta = area === 'personal' ? '/admin' : '/iniciar-sesion';
  if (window.location.pathname === puerta) return;

  echandoSesion = true;
  try { localStorage.removeItem(CAJON[area]); } catch { /* si falla, igual salimos */ }

  toast.error(tAhora('Tu sesión venció. Vuelve a iniciar sesión.'));

  // Se lleva a dónde estaba para devolverlo ahí después de entrar.
  const volver = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.assign(`${puerta}?volver=${volver}`);
};

api.interceptors.response.use(
    // 2- Respuesta exitosa (status 200-299): se deja pasar tal cual
    (response) => {
        return response;
    },

    // 3- Error de respuesta: se maneja de forma centralizada
    (error) => {
        // 3.1- LAS PETICIONES DE FONDO NO ECHAN A NADIE.
        // Hay llamadas que la tienda hace por su cuenta, sin que nadie las pidiera: clasificar el
        // catálogo, entender una frase dictada.
        if (error.config?.enSilencio) {
            return Promise.reject(error);
        }

        // 4- Si no hay respuesta del servidor, es un error de red o conexión
        if (!error.response) {
            toast.error(tAhora('Error de conexión. Verifica que el servidor backend esté encendido.'), { id: 'sin-conexion' });
            return Promise.reject(error);
        }

        // 5- Si sí hay respuesta, extraemos el código de estado HTTP y el mensaje
        const { status, data } = error.response;

        // 5.1- El mensaje del servidor pasa por el traductor ANTES de pintarse. Este es el único lugar de
        // toda la app donde el texto que escribió el backend se convierte en un aviso que ve el cliente.
        // Y después al idioma que eligió el cliente (en el panel, tAhora lo deja en español).
        const mensaje = tAhora(mensajeEnEspanol(data?.message, status));

        // 5.2- Un mismo error, una sola píldora. Una pantalla que pide cuatro cosas al servidor y las
        // cuatro fallan igual pintaba cuatro avisos idénticos apilados abajo al centro, tapando la tienda.
        // Con el texto como id, el segundo reemplaza al primero en vez de sumarse.
        const unaVez = { id: mensaje };

        // 6- Mostramos un mensaje diferente según el tipo de error recibido
        switch (status) {
            case 400:
                // Error del cliente: datos incorrectos, campos vacíos, duplicados, etc.
                toast.error(mensaje, unaVez);
                break;
            case 401:
                // La sesión venció o nunca existió: se cierra el cajón y se
                // manda a la puerta. Ver cerrarSesionVencida, arriba.
                cerrarSesionVencida();
                break;
            case 403:
                // Prohibido: el usuario existe pero no tiene permiso para esa acción
                toast.error(tAhora('Acceso denegado. No tienes permisos para esta acción.'), { id: 'sin-permiso' });
                break;
            case 500:
                // Error del servidor: algo falló en el backend (base de datos, etc.)
                toast.error(tAhora('Error interno del servidor.'), { id: 'error-servidor' });
                break;
            default:
                // Cualquier otro error no contemplado arriba (404, 409, 422...).
                // El traductor ya eligió un respaldo acorde al código, así que
                // aquí no hace falta un `||` con un texto genérico.
                toast.error(mensaje, unaVez);
        }

        // 7- Rechazamos la promesa para que el catch() del componente también lo reciba
        return Promise.reject(error);
    }
);

export default api;
