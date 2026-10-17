// Las cuentas de cómo repartir la pantalla, sin nada de React Native (las usa
// hooks/useDisposicion.js y se pueden probar solas).

export const MARGEN_CATALOGO = 16;
export const SEPARACION_CATALOGO = 12;

// El lado corto desde el que un aparato cuenta como tablet (la frontera de Android).
export const LADO_TABLET = 600;

// Cuántas tarjetas de producto caben por fila: cada una de ~165 px en el teléfono y de ~210 px en
// la tablet, que es el tamaño en que se leen bien la foto y el precio. Nunca menos de 2 (así se
// diseñó la tarjeta) ni más de 5.
export const columnasPara = (ancho, esTablet) => {
  const celda = esTablet ? 210 : 165;
  const caben = Math.floor((ancho - MARGEN_CATALOGO * 2 + SEPARACION_CATALOGO) / (celda + SEPARACION_CATALOGO));
  return Math.max(2, Math.min(5, caben));
};

// El ancho de cada tarjeta, para que la última fila incompleta no se estire.
export const anchoDeCelda = (ancho, columnas) =>
  (ancho - MARGEN_CATALOGO * 2 - SEPARACION_CATALOGO * (columnas - 1)) / columnas;
