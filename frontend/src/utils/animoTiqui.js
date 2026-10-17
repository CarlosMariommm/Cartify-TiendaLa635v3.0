// EL ÁNIMO DE TIQUI — animoTiqui.js
// Cada frase de Tiqui lleva un ánimo: alegre, emocionada, asombrada, rie, apenada, dudosa o
// normal.

export const animoDeFrase = (texto = '') => {
  if (/(Pasa a caja|Lleva tu carrito a caja|Te abro el pago)/.test(texto)) return 'emocionada'; // cerró la compra
  if (/^(Agregué|Te agregué|¡Listo|Listo)/.test(texto)) return 'alegre';
  if (/^(No te entendí|Perdón, se me cortó|Uy, me distraje)/.test(texto)) return 'dudosa';
  if (/^(No encontré|No tienes|No pude|Tu navegador no)/.test(texto)) return 'apenada';
  return 'normal';
};

// Las caras que sabe poner la mascota: normal, contento, feliz y confundido.
const CARAS = {
  alegre: 'contento',
  asombrada: 'contento',
  emocionada: 'feliz',
  rie: 'feliz',
  apenada: 'confundido',
  dudosa: 'confundido',
};

export const caraDeAnimo = (animo) => CARAS[animo] || 'normal';
