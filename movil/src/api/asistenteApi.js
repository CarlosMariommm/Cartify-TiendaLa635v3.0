// TIQUI — el asistente con IA
// Le manda la frase a `/ai/asistente` (el mismo cerebro que la web) cuando las reglas rápidas no
// alcanzan, y recibe las acciones y la frase que hay que decir.

import { peticion, URL_API } from './api';

export const asistenteApi = {
  // Nunca lanza error: sin internet devuelve origen 'sin-red' y el asistente lo dice tal cual. El
  // catálogo lo pone el servidor; aquí solo viaja lo que sabe el teléfono: el carrito y lo último
  // que se habló.
  asistente: async ({ frase, carrito, historial, productos = [] }) => {
    try {
      return await peticion('/ai/asistente', {
        metodo: 'POST',
        cuerpo: { frase, carrito, historial },
        tiempoMaximo: 15000,
      });
    } catch (error) {
      // El servidor todavía no tiene Tiqui (404): pasa si la app se actualiza antes que Render. Se usa
      // la ruta de antes, que devuelve lo mismo (acciones + respuesta) pero necesita que le mandemos los
      // productos.
      if (error?.estado === 404) {
        try {
          return await peticion('/ai/entender-herramientas', {
            metodo: 'POST',
            cuerpo: { frase, carrito, historial, productos: productos.map((p) => ({ nombre: p.nombre, precio: p.precio })) },
            tiempoMaximo: 15000,
          });
        } catch {
          // Sigue abajo: sin red.
        }
      }
      return { acciones: [], respuesta: '', entendido: false, origen: 'sin-red' };
    }
  },

  // Despierta el servidor al abrir el asistente (Render lo duerme si no hay tráfico) y pregunta si
  // tiene la voz de Tiqui. Nunca falla: sin respuesta, `voz` es false y se habla con la voz del
  // teléfono.
  despertar: async () => {
    try {
      const datos = await peticion('/ai/listo', { tiempoMaximo: 45000 });
      return { voz: Boolean(datos?.voz) };
    } catch {
      return { voz: false };
    }
  },

  // Dónde está el audio de una frase dicha por Tiqui (ver backend utils/vozTiqui.js).
  // `animo`: cómo suena la frase (ver utils/animoTiqui.js). Lo normal no viaja.
  urlVoz: (texto, animo) =>
    `${URL_API}/ai/voz?t=${encodeURIComponent(texto)}${animo && animo !== 'normal' ? `&a=${animo}` : ''}`,
};

export default asistenteApi;
