// La forma de la mascota: la etiqueta del logo. Vive aparte porque la dibujan dos componentes
// —Mascota (las ilustraciones de la tienda) y MascotaAsistente (el asistente de voz)— y la
// etiqueta tiene que ser exactamente la misma en los dos.

export const CUERPO =
  'M183,127 Q200,110 217,127 L261.6,171.6 Q280,190 280,216 C284,258 284,302 280,344 ' +
  'Q280,380 244,380 C215,383 185,383 156,380 Q120,380 120,344 C116,302 116,258 120,216 ' +
  'Q120,190 138.4,171.6 Z';

// El agujero va recortado del cuerpo (fill-rule evenodd): se ve el fondo a través.
export const AGUJERO = ' M212,160 A12,12 0 1 0 188,160 A12,12 0 1 0 212,160 Z';

// El cordón que sale del agujero y sube, como la pajita de un batido.
export const CORDON = 'M200,160 C200,126 216,118 223,96 C230,74 212,64 219,44';
