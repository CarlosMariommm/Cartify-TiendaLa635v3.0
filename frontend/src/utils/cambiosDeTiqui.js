// CUANDO TIQUI DEL PANEL CAMBIA ALGO — cambiosDeTiqui.js
// Tiqui mueve un pedido o cambia un precio desde la esquina, pero la pantalla que está abierta
// (Pedidos, Inventario…) cargó sus datos antes.

const EVENTO = 'tiqui-panel:cambio';

export const TIPOS_PEDIDOS = ['estado_pedido'];
export const TIPOS_INVENTARIO = ['existencias', 'precio', 'mostrar_producto', 'ocultar_producto'];
export const TIPOS_PROMOCIONES = ['activar_promocion', 'desactivar_promocion', 'precio_promocion'];
export const TIPOS_AJUSTES = ['temporada'];

export const avisarCambioDeTiqui = (tipo) => {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: { tipo } }));
};

// Llama `alCambiar` cuando Tiqui cambió algo de estos `tipos`. Devuelve cómo dejar de escuchar.
export const alCambiarTiqui = (tipos, alCambiar) => {
  const oyente = (e) => { if (tipos.includes(e.detail?.tipo)) alCambiar(e.detail.tipo); };
  window.addEventListener(EVENTO, oyente);
  return () => window.removeEventListener(EVENTO, oyente);
};
