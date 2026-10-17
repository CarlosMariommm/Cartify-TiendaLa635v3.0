// PÍXELES ↔ CENTÍMETROS — pxImpresion.js
// Puerto de `frontend/src/utils/pxImpresion.js`.
const DPI_IMPRESION = 300;
const CM_POR_PULGADA = 2.54;

export const pxDesdeCm = (cm) => Math.round((Number(cm) || 0) / CM_POR_PULGADA * DPI_IMPRESION);
