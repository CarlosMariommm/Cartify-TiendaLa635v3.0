// EL ÁNIMO DE TIQUI — animoTiqui.js
// La misma regla que frontend/src/utils/animoTiqui.js.

export const animoDeFrase = (texto = '') => {
  if (/(Pasa a caja|Lleva tu carrito a caja|Te abro el pago)/.test(texto)) return 'emocionada'; // cerró la compra
  if (/^(Agregué|Te agregué|¡Listo|Listo)/.test(texto)) return 'alegre';
  if (/^(No te entendí|Perdón, se me cortó|Uy, me distraje)/.test(texto)) return 'dudosa';
  if (/^(No encontré|No tienes|No pude)/.test(texto)) return 'apenada';
  return 'normal';
};
