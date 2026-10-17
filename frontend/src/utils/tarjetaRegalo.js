// EL CÓDIGO DE UNA TARJETA DE REGALO — tarjetaRegalo.js
// Los códigos son "635-A7K2-M9QX" (ver backend/src/controller/ giftCardController.js) y el
// servidor los busca tal cual, con sus guiones.

const PREFIJO = '635';
const LARGO_SIN_GUIONES = 11;

// Lo más que mide con sus guiones: para el maxLength del campo.
export const LARGO_CODIGO_TARJETA = 13;

export const formatoCodigoTarjeta = (texto = '') => {
  let limpio = String(texto).toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Sin el "635": mientras lo que va escrito todavía puede ser el comienzo del prefijo ("6", "63")
  // se deja; si ya no ("A7", "6A"), se le antepone.
  if (limpio && !PREFIJO.startsWith(limpio.slice(0, PREFIJO.length)) && !limpio.startsWith(PREFIJO)) {
    limpio = PREFIJO + limpio;
  }
  limpio = limpio.slice(0, LARGO_SIN_GUIONES);
  return [limpio.slice(0, 3), limpio.slice(3, 7), limpio.slice(7, 11)].filter(Boolean).join('-');
};
