// LAS OPCIONES DE LAS COOKIES — cookieSesion.js
// Un solo sitio que decide cómo se emiten TODAS las cookies de la app.

const ENTRE_DOMINIOS = process.env.COOKIES_ENTRE_DOMINIOS === "true";

// Recibe: maxAge, extra.
export const opcionesCookie = (maxAge, extra = {}) => ({
  httpOnly: true,
  maxAge,
  ...(ENTRE_DOMINIOS
    ? { sameSite: "none", secure: true }
    : /*
       * En local, "lax" es el valor por defecto del navegador de todas formas;
       * escribirlo deja claro que es una decisión y no un olvido.
       */
      { sameSite: "lax", secure: false }),
  ...extra,
});

export default opcionesCookie;
