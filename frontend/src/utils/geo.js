// GEO — geo.js
// Cuentas de distancia y tiempo entre dos puntos del mapa, para el seguimiento en vivo del
// repartidor.

const RADIO_TIERRA_M = 6371000;
const aRadianes = (g) => (g * Math.PI) / 180;

// Distancia en metros entre dos coordenadas (fórmula de Haversine, la de siempre para distancias
// sobre la esfera de la Tierra).
export const distanciaMetros = (a, b) => {
  if (!a || !b) return null;
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;

  const dLat = aRadianes(b.lat - a.lat);
  const dLng = aRadianes(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRadianes(a.lat)) * Math.cos(aRadianes(b.lat)) * Math.sin(dLng / 2) ** 2;

  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(h));
};

// "350 m" / "1.2 km" — a nadie le sirve leer 1247.38 metros.
export const formatoDistancia = (metros) => {
  if (metros == null) return '';
  if (metros < 1000) return `${Math.round(metros / 10) * 10} m`;
  return `${(metros / 1000).toFixed(1)} km`;
};

// Cuánto falta, en minutos.
const VELOCIDAD_POR_DEFECTO_MS = 18000 / 3600; // 18 km/h en metros por segundo
const RODEO_DE_CALLES = 1.35;

export const minutosDeViaje = (metros, velocidadMs) => {
  if (metros == null) return null;

  const v = velocidadMs && velocidadMs > 0.5 ? velocidadMs : VELOCIDAD_POR_DEFECTO_MS;
  const segundos = (metros * RODEO_DE_CALLES) / v;
  // Menos de un minuto se redondea a uno: "llega en 0 min" no dice nada.
  return Math.max(1, Math.round(segundos / 60));
};

// Texto de la espera, en rangos y con "aprox.": un minuto exacto sería una promesa. `t` traduce
// al idioma elegido; sin él sale en español.
export const textoDeEspera = (minutos, t = (s, v) => (v ? s.replace('{n}', v.n) : s)) => {
  // Sin minutos no se inventa un tiempo: pasa con los pedidos viejos, que guardaron la dirección
  // escrita pero no el punto en el mapa, así que no hay contra qué medir. "Va en camino" es poco,
  // pero es cierto.
  if (minutos == null) return t('Va en camino');
  if (minutos <= 2) return t('Está llegando');
  if (minutos <= 5) return t('Llega en unos {n} min', { n: 5 });
  if (minutos <= 60) return t('Llega en {n} min aprox.', { n: Math.round(minutos / 5) * 5 });
  return t('Va en camino');
};
