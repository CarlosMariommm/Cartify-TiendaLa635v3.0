// MODO CLARO / OSCURO — modo.js
// Lo que elige cada persona en Mi cuenta → Preferencias. Copia de `frontend/src/utils/modo.js`,
// con el mismo criterio: vive en ESTE teléfono (el almacén de la app), no en la cuenta.

import { leer, guardar, llave } from './almacen';

export const LLAVE_MODO = llave('modo');

export const MODOS = ['claro', 'oscuro', 'sistema'];

export const leerModoGuardado = async () => {
  const guardado = await leer(LLAVE_MODO);
  return MODOS.includes(guardado) ? guardado : 'claro';
};

// Si no se pudo guardar, el modo se aplica igual: solo que no se recuerda la próxima vez que abra
// la app. No vale la pena un aviso por eso.
export const guardarModo = (modo) => guardar(LLAVE_MODO, modo);

// `esquema` es lo que dice el teléfono (useColorScheme): 'dark', 'light' o null.
export const esOscuro = (modo, esquema) =>
  modo === 'oscuro' || (modo === 'sistema' && esquema === 'dark');
