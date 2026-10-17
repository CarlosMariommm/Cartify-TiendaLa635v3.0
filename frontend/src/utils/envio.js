// COSTO DE ENVÍO POR DISTANCIA — envio.js (frontend)
// El MISMO cálculo que backend/src/utils/envio.js, para que el carrito muestre exactamente lo que
// el servidor va a cobrar.

const RADIO_TIERRA_KM = 6371;
const rad = (g) => (g * Math.PI) / 180;

const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
// Ojo: Number(null) === 0, así que un coord vacío (null/''/undefined) NO se puede
// tratar como número, o una dirección sin punto se leería como (0,0) en el mar.
const esCoord = (v) => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));
const hayCoord = (lat, lng) => esCoord(lat) && esCoord(lng);
const redondear = (n) => Number(num(n, 0).toFixed(2));

// Hasta dónde se entrega: el mismo tope que el servidor (ver RADIO_MAXIMO_KM
// en backend/src/utils/envio.js). Más lejos, el pedido a domicilio no se acepta.
export const RADIO_MAXIMO_KM = 30;

// Distancia en km entre dos puntos (haversine).
export const distanciaKm = (lat1, lng1, lat2, lng2) => {
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return RADIO_TIERRA_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Devuelve { costo, metodo, distanciaKm, zona }. `metodo` sirve para el texto de apoyo en el
// carrito ("$2.50 · a 3 km" o "$2.00 · Centro").
export const calcularEnvio = (ajustes = {}, destino = {}) => {
  const base = num(ajustes.envioBase, 1);
  const porKm = num(ajustes.envioPorKm, 0.5);
  const zonas = Array.isArray(ajustes.zonasEnvio) ? ajustes.zonasEnvio : [];
  const tienda = ajustes.ubicacionTienda || {};
  const lat = destino?.lat;
  const lng = destino?.lng;

  if (!hayCoord(lat, lng)) {
    return { costo: redondear(base), metodo: "base", distanciaKm: null, zona: null };
  }

  const dentro = zonas
    .filter((z) => hayCoord(z.lat, z.lng) && distanciaKm(lat, lng, z.lat, z.lng) <= num(z.radioKm, 1))
    .sort((a, b) => num(a.radioKm, 1) - num(b.radioKm, 1))[0];
  if (dentro) {
    return { costo: redondear(dentro.precio), metodo: "zona", distanciaKm: null, zona: dentro.nombre };
  }

  if (hayCoord(tienda.lat, tienda.lng)) {
    const km = distanciaKm(tienda.lat, tienda.lng, lat, lng);
    return {
      costo: redondear(base + porKm * km),
      metodo: "km",
      distanciaKm: Math.round(km * 10) / 10,
      zona: null,
      fueraDeCobertura: km > num(ajustes.radioMaximoKm, RADIO_MAXIMO_KM),
    };
  }

  return { costo: redondear(base), metodo: "base", distanciaKm: null, zona: null };
};
