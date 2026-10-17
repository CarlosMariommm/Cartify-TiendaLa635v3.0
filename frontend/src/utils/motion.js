// TOKENS DE MOVIMIENTO — motion.js
// Curvas y duraciones compartidas para TODA la app, siguiendo los estándares de diseño de Emil
// Kowalski.

export const EASE_OUT = [0.23, 1, 0.32, 1];
export const EASE_IN_OUT = [0.77, 0, 0.175, 1];
export const EASE_DRAWER = [0.32, 0.72, 0, 1];

// Duraciones en segundos (framer). La UI se mantiene por debajo de 300ms.
export const DUR = {
  press: 0.16,    // feedback al presionar
  popover: 0.18,  // tooltips y menús chicos
  dropdown: 0.2,
  modal: 0.22,    // modales y diálogos
  drawer: 0.28,   // cajones laterales
};

// Presets listos para los modales (todos iguales = app coherente).
export const overlayTransition = { duration: DUR.popover, ease: EASE_OUT };
export const modalTransition = { duration: DUR.modal, ease: EASE_OUT };

// Nada de scale(0): las cosas no aparecen de la nada, arrancan casi a tamaño.
export const modalInitial = { opacity: 0, scale: 0.96, y: 12 };
export const modalAnimate = { opacity: 1, scale: 1, y: 0 };

// Retraso escalonado para grillas (30–80ms entre tarjetas, con tope).
export const stagger = (i, ms = 45, tope = 8) => (Math.min(i, tope) * ms) / 1000;
