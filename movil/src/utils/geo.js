// GEO — geo.js
// Cuentas de distancia y tiempo entre dos puntos del mapa, para el seguimiento en vivo del
// repartidor.

import { tAhora } from './idioma';

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

// Cuánto falta, en minutos. La velocidad la medimos del propio viaje cuando hay con qué; si
// todavía no hay historia, se asume una moto de barrio a 18 km/h, con un colchón de 1.35 porque la
// línea recta siempre miente a favor (las calles dan vuelta).
const VELOCIDAD_POR_DEFECTO_MS = 18000 / 3600; // 18 km/h en metros por segundo
const RODEO_DE_CALLES = 1.35;

export const minutosDeViaje = (metros, velocidadMs) => {
  if (metros == null) return null;

  const v = velocidadMs && velocidadMs > 0.5 ? velocidadMs : VELOCIDAD_POR_DEFECTO_MS;
  const segundos = (metros * RODEO_DE_CALLES) / v;
  // Menos de un minuto se redondea a uno: "llega en 0 min" no dice nada.
  return Math.max(1, Math.round(segundos / 60));
};

// Texto de la espera. Se habla en rangos y con "aprox" a propósito: dar un minuto exacto es
// prometer algo que no controlamos.
export const textoDeEspera = (minutos) => {
  if (minutos == null) return tAhora('Va en camino');
  if (minutos <= 2) return tAhora('Está llegando');
  if (minutos <= 5) return tAhora('Llega en unos {n} min', { n: 5 });
  if (minutos <= 60) return tAhora('Llega en {n} min aprox.', { n: Math.round(minutos / 5) * 5 });
  return tAhora('Va en camino');
};
