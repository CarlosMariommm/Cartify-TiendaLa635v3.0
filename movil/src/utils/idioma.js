import EN from '../i18n/en';
import { leer, guardar, llave } from './almacen';

// EL IDIOMA DE LA APP — idioma.js
// La misma idea que la web (frontend/src/utils/idioma.js): la clave de cada frase es el texto en
// español, y `traducir` busca su versión en inglés en i18n/en.js.

export const LLAVE_IDIOMA = llave('idioma');

export const IDIOMAS = [
  { clave: 'es', nombre: 'Español', corto: 'ES' },
  { clave: 'en', nombre: 'English', corto: 'EN' },
];

export const esIdiomaValido = (i) => IDIOMAS.some((x) => x.clave === i);

// Español si nadie eligió otro: es la tienda de siempre y su público.
export const leerIdiomaGuardado = async () => {
  const guardado = await leer(LLAVE_IDIOMA);
  return esIdiomaValido(guardado) ? guardado : 'es';
};

export const guardarIdioma = (idioma) => guardar(LLAVE_IDIOMA, idioma);

// Para fechas y números: "3 de octubre" o "October 3".
export const localeDe = (idioma) => (idioma === 'en' ? 'en-US' : 'es-SV');

const avisados = new Set();

export const traducir = (idioma, texto, vars) => {
  let s = texto;
  if (idioma === 'en') {
    const traducido = EN[texto];
    if (traducido != null) {
      s = traducido;
    } else if (__DEV__ && texto && !avisados.has(texto)) {
      // Para ir encontrando lo que falta: sale una vez por texto.
      avisados.add(texto);
      console.warn(`[idioma] Falta traducir al inglés: "${texto}"`);
    }
  }
  return vars ? String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)) : s;
};

// El idioma de este momento, para lo que traduce FUERA de un componente: un aviso que sale de
// TiendaContext, un error del servidor en api.js. Lo pone IdiomaProvider mientras la tienda está
// montada; en el modo del personal vuelve a español.
let idiomaActual = 'es';
export const fijarIdiomaActual = (idioma) => {
  idiomaActual = esIdiomaValido(idioma) ? idioma : 'es';
};
export const idiomaDeAhora = () => idiomaActual;
export const tAhora = (texto, vars) => traducir(idiomaActual, texto, vars);
