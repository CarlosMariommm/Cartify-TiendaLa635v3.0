// CONSENTIMIENTO — terminos.js (backend)
// La versión de los términos que está en vigor, y cómo se lee una casilla que llegó por multipart.
// El texto vive en el frontend (`frontend/src/utils/terminos.js`) y ahí también está su versión.

export const VERSION_TERMINOS = '3.1';

// Las casillas llegan por FormData, y ahí todo es texto: un checkbox marcado viaja como la cadena
// "true", no como el booleano true. Y `Boolean("false")` es true, que es exactamente el error que
// dejaría pasar a quien NO aceptó. De ahí que esto exista en vez de un `!!` suelto.
export const esVerdadero = (valor) =>
  valor === true || valor === 'true' || valor === '1' || valor === 'on';
