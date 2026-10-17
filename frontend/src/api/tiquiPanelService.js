import api from './api';

// Tiqui del panel: la asistente del equipo. Es OTRA asistente que la de la tienda
// (aiService.asistente) y habla con su propia ruta, que solo abre una sesión de personal. Ver
// backend/src/controller/tiquiPanelController.js.
export const tiquiPanelService = {
  conversar: async ({ frase, historial, pantalla }) => {
    try {
      // 30 s: si Render estaba dormido, despertar tarda más que la IA.
      const { data } = await api.post('/tiqui-panel', { frase, historial, pantalla }, { enSilencio: true, timeout: 30000 });
      return data;
    } catch (error) {
      return {
        acciones: [],
        respuesta: '',
        entendido: false,
        // Un 429 es el tope de preguntas por minuto: se dice distinto que una caída.
        origen: error?.response?.status === 429 ? 'tope' : error?.code === 'ECONNABORTED' ? 'lento' : 'sin-red',
      };
    }
  },

  // La persona dijo que sí a un cambio que Tiqui propuso: se aplica (ver cambiosTiqui.js del backend).
  confirmar: async (token) => {
    try {
      const { data } = await api.post('/tiqui-panel/confirmar', { token }, { enSilencio: true, timeout: 30000 });
      return data;
    } catch {
      return { ok: false, respuesta: 'No me pude conectar para hacerlo. Revisa la conexión y me lo vuelves a pedir.' };
    }
  },

  // Despierta el servidor (Render lo duerme) y pregunta si hay voz de Tiqui.
  despertar: async () => {
    try {
      const { data } = await api.get('/tiqui-panel/listo', { enSilencio: true, timeout: 45000 });
      // `consejo`: el consejo de ventas más importante, solo para el administrador.
      return { voz: Boolean(data?.voz), consejo: String(data?.consejo || '') };
    } catch {
      return { voz: false, consejo: '' };
    }
  },

  // La voz sí es la misma de la tienda: convertir texto en audio no sabe de
  // ninguna de las dos asistentes.
  urlVoz: (texto) => `${api.defaults.baseURL}/ai/voz?t=${encodeURIComponent(texto)}`,
};

export default tiquiPanelService;
