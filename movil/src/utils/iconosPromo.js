// ICONOS DE PROMOCIÓN — iconosPromo.js
// Un puñado de iconos para que el banner diga de qué va sin leerlo.

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// El id es el que guarda la promo (lo pone el panel) y el nombre es el glifo de
// MaterialCommunityIcons. Los nombres están verificados contra el glyphmap del paquete: uno
// inventado no avisa, simplemente pinta un cuadro vacío.
export const ICONOS_PROMO = {
  llama: 'fire',
  chispa: 'shimmer',
  estrella: 'star-outline',
  porcentaje: 'percent-outline',
  etiqueta: 'tag-outline',
  regalo: 'gift-outline',
  corazon: 'heart-outline',
  canasta: 'basket-outline',
  bebida: 'cup-outline',
  cafe: 'coffee-outline',
  fruta: 'food-apple-outline',
  verdura: 'leaf',
  lacteo: 'bottle-soda-classic-outline',
  galleta: 'cookie-outline',
  pan: 'baguette',
  helado: 'ice-cream',
};

// El nombre del glifo elegido, o null si la promo no lleva icono. Null es un resultado normal: el
// icono es opcional en el panel.
export const glifoDePromo = (id) => ICONOS_PROMO[id] || null;

export { MaterialCommunityIcons };
