// PÍXELES ↔ CENTÍMETROS — pxImpresion.js
// En el panel de Servicios de Impresión, el dueño da la medida de un formato en PÍXELES (lo que
// conoce: "1200x1200", como una foto) y no en centímetros.
const DPI_IMPRESION = 300;
const CM_POR_PULGADA = 2.54;

export const cmDesdePx = (px) => (Number(px) || 0) / DPI_IMPRESION * CM_POR_PULGADA;

export const pxDesdeCm = (cm) => Math.round((Number(cm) || 0) / CM_POR_PULGADA * DPI_IMPRESION);
