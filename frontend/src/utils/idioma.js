import EN from '../i18n/en';
import { areaDeRuta } from './sesion';

// EL IDIOMA DE LA TIENDA — idioma.js
// Español (el de siempre) o inglés, para la tienda y Mi Cuenta. El panel del personal se queda en
// español: lo usa el equipo de la tienda.

export const LLAVE_IDIOMA = 'la635_idioma';

export const IDIOMAS = [
  { clave: 'es', nombre: 'Español', corto: 'ES' },
  { clave: 'en', nombre: 'English', corto: 'EN' },
];

const esValido = (i) => IDIOMAS.some((x) => x.clave === i);

// Español si nadie eligió otro: es la tienda de siempre y su público.
export const leerIdiomaGuardado = () => {
  try {
    const guardado = localStorage.getItem(LLAVE_IDIOMA);
    return esValido(guardado) ? guardado : 'es';
  } catch {
    return 'es';
  }
};

export const guardarIdioma = (idioma) => {
  try { localStorage.setItem(LLAVE_IDIOMA, idioma); } catch { /* sin memoria: vale mientras esté abierta */ }
};

// Para fechas y números: "3 de octubre" o "October 3".
export const localeDe = (idioma) => (idioma === 'en' ? 'en-US' : 'es-SV');

const avisados = new Set();

export const traducir = (idioma, texto, vars) => {
  let s = texto;
  if (idioma === 'en') {
    const traducido = EN[texto];
    if (traducido != null) {
      s = traducido;
    } else if (import.meta.env.DEV && texto && !avisados.has(texto)) {
      // Para ir encontrando lo que falta: sale una vez por texto.
      avisados.add(texto);
      console.warn(`[idioma] Falta traducir al inglés: "${texto}"`);
    }
  }
  return vars ? String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)) : s;
};

// Para los avisos que salen desde fuera de un componente (un toast dentro de un hook o de utils):
// traduce al idioma elegido EN ESE MOMENTO. Dentro de un componente va `t` de useIdioma, que
// además repinta si se cambia el idioma.
export const tAhora = (texto, vars) => {
  const enPanel = typeof window !== 'undefined' && areaDeRuta(window.location.pathname) === 'personal';
  return traducir(enPanel ? 'es' : leerIdiomaGuardado(), texto, vars);
};

export { esValido as esIdiomaValido };
