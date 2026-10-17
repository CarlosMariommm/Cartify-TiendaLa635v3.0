// DATOS DE LA TIENDA — tienda.js
// El nombre, la dirección y el contacto de La 635, en UN solo lugar. Cambiar algo obligaba a
// acordarse de todos los archivos que lo mencionaban, y siempre se escapaba uno.

// Las dos líneas del nombre. Van separadas porque en el encabezado y en el pie
// se apilan, con el MISMO peso y color: "Tienda" no es una etiqueta que
// acompaña, es parte del nombre del negocio.
export const NOMBRE_TIENDA = { arriba: 'Tienda', abajo: 'la 635' };

export const NOMBRE_COMPLETO = 'Tienda la 635';

// De aquí salen los repartos y aquí llega quien quiera pasar comprando.
export const DIRECCION_TIENDA = {
  calle: 'Calle Sevilla 635',
  colonia: 'Col. Providencia',
  pais: 'El Salvador',
};

export const DIRECCION_EN_UNA_LINEA = `${DIRECCION_TIENDA.calle}, ${DIRECCION_TIENDA.colonia}`;

// El WhatsApp sale del .env (VITE_WHATSAPP), igual que en el botón flotante: formato internacional
// sin signos, El Salvador es 503 + los 8 dígitos. Si no está configurado queda vacío, y quien lo
// consuma simplemente no pinta el enlace.
export const WHATSAPP = (import.meta.env.VITE_WHATSAPP || '').replace(/\D/g, '');

// El número en formato de wa.me: solo dígitos y con el código de país. Un número salvadoreño de 8
// dígitos ("7000-0000") se completa con el 503.
export const numeroWhatsApp = (numero) => {
  const digitos = String(numero || '').replace(/\D/g, '');
  if (!digitos) return '';
  return digitos.length === 8 ? `503${digitos}` : digitos;
};

// `numero`: el WhatsApp que el dueño puso en Personalización → Datos del negocio. Manda sobre el
// del .env, que queda de respaldo.
export const enlaceWhatsApp = (mensaje, numero) => {
  const destino = numeroWhatsApp(numero) || WHATSAPP;
  return destino
    ? `https://wa.me/${destino}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`
    : null;
};

// La página de presentación de la tienda (la landing). Es un proyecto aparte, con su propio
// Vercel, y se enlaza desde el pie. Se puede cambiar desde el .env (VITE_LANDING_URL) sin tocar
// código, por si algún día se muda.
export const LANDING_URL = import.meta.env.VITE_LANDING_URL || 'https://cartify-tienda-la635-landingpage.vercel.app/';
