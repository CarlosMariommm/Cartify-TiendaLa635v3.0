import api from './api';

// SERVICIO DE IA — aiService.js Redacta promociones y atiende a Tiqui, el asistente de voz.
export const aiService = {
  generarCopyPromo: async (payload) => {
    const response = await api.post('/ai/promo-copy', payload);
    return response.data;
  },

  // Tiqui: descifra lo que dijo el cliente y devuelve qué hacer (acciones) y qué decir. Se llama
  // cuando las reglas rápidas del asistente no alcanzan ("quiero dos manzanas" se resuelve al
  // instante sin salir a internet).
  asistente: async ({ frase, carrito, historial, productos = [] }) => {
    try {
      // enSilencio: si la IA no contesta, ni aviso rojo ni sesión cerrada
      // (ver api.js). Y con tope: alguien está esperando parado.
      const response = await api.post('/ai/asistente', { frase, carrito, historial }, { enSilencio: true, timeout: 15000 });
      return response.data;
    } catch (error) {
      // El servidor todavía no tiene Tiqui (404): pasa mientras la web ya se actualizó y Render no.
      // Ahora se usa la ruta vieja, que contesta una acción por turno y necesita que le mandemos los
      // productos.
      if (error?.response?.status === 404) return aiService.asistenteViejo({ frase, carrito, historial, productos });
      return { acciones: [], respuesta: '', entendido: false, origen: 'sin-red' };
    }
  },

  // La ruta de antes de Tiqui, con su respuesta traducida a la forma nueva.
  asistenteViejo: async ({ frase, carrito, historial, productos }) => {
    try {
      const { data } = await api.post(
        '/ai/entender',
        { frase, carrito, historial, productos: productos.map((p) => ({ nombre: p.nombre, precio: p.precio })) },
        { enSilencio: true, timeout: 15000 }
      );
      const hayAccion = data?.accion && data.accion !== 'ninguna';
      return {
        acciones: hayAccion ? [{ tipo: data.accion, producto: data.producto, cantidad: data.cantidad }] : [],
        respuesta: data?.respuesta || '',
        entendido: Boolean(data?.entendido),
        origen: data?.origen || 'ia',
      };
    } catch {
      return { acciones: [], respuesta: '', entendido: false, origen: 'sin-red' };
    }
  },

  // Despierta el servidor apenas se abre el asistente (Render lo duerme si no hay tráfico) y
  // pregunta si hay voz de Tiqui. Nunca falla: sin respuesta, `voz` es false y se habla con la voz
  // del sistema.
  despertar: async () => {
    try {
      const response = await api.get('/ai/listo', { enSilencio: true, timeout: 45000 });
      return { voz: Boolean(response.data?.voz) };
    } catch {
      return { voz: false };
    }
  },

  // Dónde está el audio de una frase dicha por Tiqui (ver backend utils/vozTiqui.js).
  // `animo`: cómo suena la frase (ver utils/animoTiqui.js). Lo normal no viaja.
  urlVoz: (texto, animo) =>
    `${api.defaults.baseURL}/ai/voz?t=${encodeURIComponent(texto)}${animo && animo !== 'normal' ? `&a=${animo}` : ''}`,
};
