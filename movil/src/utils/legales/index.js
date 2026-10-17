import { TERMINOS } from './terminos';
import { PRIVACIDAD } from './privacidad';
import { DEVOLUCIONES } from './devoluciones';

// Los documentos legales de la app: los mismos textos y la misma versión que la web. La de cookies
// no va: la app no usa cookies. 3.1: Tiqui dice el primer nombre de quien inició sesión.
export const VERSION_LEGAL = '3.1';
export const FECHA_LEGAL = '28 de septiembre de 2026';

export const DOCUMENTOS_LEGALES = [TERMINOS, PRIVACIDAD, DEVOLUCIONES];

export const documentoLegal = (clave) => DOCUMENTOS_LEGALES.find((d) => d.clave === clave) || TERMINOS;

// La web, para abrir la política de cookies desde la app si alguien la busca.
export const URL_WEB_LEGAL = 'https://cartify-tienda-la635.vercel.app';
