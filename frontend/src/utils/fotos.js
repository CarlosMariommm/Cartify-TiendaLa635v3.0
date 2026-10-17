// FOTOS AL TAMAÑO EN QUE SE VEN — fotos.js
// Las fotos de los productos y las promociones viven en Cloudinary, y la tienda las pedía tal cual
// se subieron: la de las fresas pesaba 667 KB para dibujarse en un cuadro de 165 px.

const SUBIDA = '/image/upload/';

// Los anchos de la tienda, para no regar números sueltos por los componentes.
export const ANCHO = {
  miniatura: 160, // carrito, asistente, seguimiento del pedido
  tarjeta: 400, // tarjetas de producto y favoritos
  ficha: 900, // la ficha grande del producto
  promo: 1000, // tarjetas y detalle de las promociones
};

export const foto = (url, ancho) => {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com') || !url.includes(SUBIDA)) {
    return url;
  }
  // Si ya trae transformaciones (alguien la pidió a su medida), se respeta.
  const despues = url.split(SUBIDA)[1] || '';
  if (/^[a-z]{1,3}_[^/]*\//.test(despues)) return url;
  return url.replace(SUBIDA, `${SUBIDA}f_auto,q_auto,c_limit,w_${ancho}/`);
};
