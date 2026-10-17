import { TERMINOS } from './terminos';
import { PRIVACIDAD } from './privacidad';
import { COOKIES_DOC } from './cookies';
import { DEVOLUCIONES } from './devoluciones';

// LOS DOCUMENTOS LEGALES — legales/index.js
// Términos, privacidad, cookies y devoluciones como datos: los pinta cada página legal y el modal
// del registro. La versión aceptada se guarda al crear la cuenta.

// 3.1: Tiqui llama por su primer nombre a quien inició sesión, y ese nombre viaja al servicio de
// la voz (ElevenLabs). A la IA sigue sin llegarle.
export const VERSION_LEGAL = '3.1';

// La fecha en que se redactó esta versión, no la de hoy.
export const FECHA_LEGAL = '28 de septiembre de 2026';

// En el orden en que se enlazan al pie de cada documento y de la tienda.
export const DOCUMENTOS_LEGALES = [TERMINOS, PRIVACIDAD, DEVOLUCIONES, COOKIES_DOC];

export const documentoLegal = (clave) => DOCUMENTOS_LEGALES.find((d) => d.clave === clave) || TERMINOS;

// El mensaje que va escrito de antemano en el WhatsApp de "borren mis datos". La mitad de la gente
// que quiere ejercer este derecho abandona en el momento de redactar la solicitud; aquí solo tiene
// que darle enviar.
export const MENSAJE_BORRADO =
  'Hola, quiero pedir que borren mi cuenta y mis datos personales de la tienda en línea. Mi correo registrado es: ';
