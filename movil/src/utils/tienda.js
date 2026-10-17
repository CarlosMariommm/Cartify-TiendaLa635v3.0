// DATOS DE LA TIENDA — tienda.js
// Copia chica de `frontend/src/utils/tienda.js`: solo lo que hace falta acá, la dirección para
// "pasar a la tienda" y el WhatsApp para el botón de contacto en Ayuda.js.

export const DIRECCION_EN_UNA_LINEA = 'Calle Sevilla 635, Col. Providencia';

// El WhatsApp sale de `EXPO_PUBLIC_WHATSAPP` (ver .env.example), la versión de Expo del
// `VITE_WHATSAPP` que ya usa la web — mismo formato: solo dígitos, 503 + los 8 del número.
export const WHATSAPP = (process.env.EXPO_PUBLIC_WHATSAPP || '').replace(/\D/g, '');

// `numero`: el WhatsApp que el dueño puso en el panel (Personalización → Datos del negocio). Manda
// sobre el de la configuración, que queda de respaldo. Un número salvadoreño de 8 dígitos se
// completa con el 503.
export const enlaceWhatsApp = (mensaje, numero) => {
  const digitos = String(numero || '').replace(/\D/g, '');
  const destino = (digitos.length === 8 ? `503${digitos}` : digitos) || WHATSAPP;
  return destino
    ? `https://wa.me/${destino}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`
    : null;
};
