// MEDIDAS DE LA PANTALLA — pantalla.js
// Cuánto mide la barra de estado (la hora, la señal, la batería). Sin reservarle ese espacio, lo
// primero de cada pantalla queda DEBAJO de la hora.

import { Platform, StatusBar } from 'react-native';

export const ALTURA_ESTADO = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44;

// ── Tablets y pantallas anchas ──
// Medidas máximas para que en una tablet o un teléfono acostado los formularios, las hojas y la
// barra de abajo no salgan estirados.
export const ANCHO_LECTURA = 720;
export const ANCHO_HOJA = 640;
export const ANCHO_BARRA_INFERIOR = 520;

// Para el contentContainerStyle de una página: el contenido centrado con su tope.
export const contenidoCentrado = { width: '100%', maxWidth: ANCHO_LECTURA, alignSelf: 'center' };
// Para el panel de una hoja que sube desde abajo.
export const hojaCentrada = { width: '100%', maxWidth: ANCHO_HOJA, alignSelf: 'center' };

export default ALTURA_ESTADO;
