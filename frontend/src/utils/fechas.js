// FECHAS QUE PUEDEN NO EXISTIR — fechas.js
// Formatear una fecha es fácil.

// Locale de la tienda. Un solo lugar, para que el inventario y el panel no
// terminen escribiendo la misma fecha de dos formas distintas.
const LOCAL = 'es-SV';

// ¿Vale la pena tratar esto como una fecha? Se rechaza lo vacío ANTES de construir el Date: null,
// undefined, '' y 0 son "no hay dato", no son 1969. Después se rechaza lo que sí llegó pero no se
// puede leer (texto suelto, una fecha a medio guardar).
export const esFechaValida = (valor) => {
  if (!valor) return false;
  const fecha = valor instanceof Date ? valor : new Date(valor);
  return !Number.isNaN(fecha.getTime());
};

// Devuelve la fecha ya escrita, o null si no hay fecha que escribir. Las opciones son las mismas
// de toLocaleDateString, por si alguien quiere el mes con letras.
export const formatearFecha = (valor, opciones) =>
  esFechaValida(valor) ? new Date(valor).toLocaleDateString(LOCAL, opciones) : null;

// Variante corta y legible: "05 mar 2026". La que mejor se lee en tablas.
export const formatearFechaCorta = (valor) =>
  formatearFecha(valor, { day: '2-digit', month: 'short', year: 'numeric' });
