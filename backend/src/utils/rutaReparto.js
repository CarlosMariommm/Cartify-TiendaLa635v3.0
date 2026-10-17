// LA RUTA DEL REPARTIDOR — rutaReparto.js
// El cliente que espera ve en el mapa, además del punto del repartidor y su casa, la línea por las
// calles que le falta recorrer, y el "llega en…" sale de esa ruta y no de una línea recta.

// La dirección nueva de OpenRouteService: api.openrouteservice.org se está
// retirando (aviso en su panel, octubre de 2026). Misma llave, mismo formato.
const URL_ORS = "https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson";

// Si el repartidor está a más de esto de la línea, tomó otra calle: ruta nueva.
export const DESVIO_MAXIMO_M = 60;
// Aunque vaya bien, la ruta se renueva cada tanto.
export const VIGENCIA_MS = 5 * 60 * 1000;
// Nunca más de una consulta por pedido en este lapso (también tras un fallo).
export const ESPERA_ENTRE_CONSULTAS_MS = 30 * 1000;
// Lo que nadie ha preguntado en media hora se olvida.
const OLVIDO_MS = 30 * 60 * 1000;

const R = 6371000;
const rad = (g) => (g * Math.PI) / 180;
// Ojo: Number(null) es 0, y una ubicación sin llenar ({ lat: null }) no es el punto 0,0.
const valido = (p) => !!p && p.lat != null && p.lng != null
  && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng));
const comoPunto = ([lng, lat]) => ({ lat, lng });
// Cinco decimales son ~1 metro: de sobra para dibujar, y la respuesta pesa menos.
const redondear = (n) => Math.round(n * 1e5) / 1e5;

export const distanciaMetros = (a, b) => {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Distancia en metros de `p` al tramo a→b. En tramos de ciudad basta un plano local.
const alTramo = (p, a, b) => {
  const enMetros = (q) => ({ x: rad(q.lng - p.lng) * R * Math.cos(rad(p.lat)), y: rad(q.lat - p.lat) * R });
  const A = enMetros(a);
  const B = enMetros(b);
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const largo2 = dx * dx + dy * dy;
  const t = largo2 ? Math.max(0, Math.min(1, -(A.x * dx + A.y * dy) / largo2)) : 0;
  return Math.hypot(A.x + t * dx, A.y + t * dy);
};

// Lo que falta de la ruta, visto desde donde va el repartidor: la línea arranca en él y sigue
// desde el tramo más cercano. Devuelve también qué tan lejos está de la ruta (para saber si se
// desvió) y cuántos metros faltan.
export const recortarRuta = (puntos, posicion) => {
  if (!Array.isArray(puntos) || puntos.length < 2 || !valido(posicion)) return null;
  let mejor = { i: 0, metros: Infinity };
  for (let i = 0; i < puntos.length - 1; i++) {
    const metros = alTramo(posicion, comoPunto(puntos[i]), comoPunto(puntos[i + 1]));
    if (metros < mejor.metros) mejor = { i, metros };
  }
  const linea = [[posicion.lng, posicion.lat], ...puntos.slice(mejor.i + 1)];
  let metrosRestantes = 0;
  for (let i = 0; i < linea.length - 1; i++) metrosRestantes += distanciaMetros(comoPunto(linea[i]), comoPunto(linea[i + 1]));
  return { puntos: linea, desvioM: mejor.metros, metrosRestantes };
};

// La consulta a OpenRouteService. Devuelve { puntos: [[lng, lat]…], metros, segundos } o null si
// no encontró camino (un punto lejos de toda calle).
export const pedirRutaORS = async ({ desde, hacia, llave }) => {
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), 6000);
  try {
    const respuesta = await fetch(URL_ORS, {
      method: "POST",
      headers: { Authorization: llave, "Content-Type": "application/json", Accept: "application/geo+json" },
      body: JSON.stringify({ coordinates: [[desde.lng, desde.lat], [hacia.lng, hacia.lat]] }),
      signal: corte.signal,
    });
    if (!respuesta.ok) throw new Error(`OpenRouteService respondió ${respuesta.status}`);
    const datos = await respuesta.json();
    const ruta = datos?.features?.[0];
    const coordenadas = ruta?.geometry?.coordinates;
    if (!Array.isArray(coordenadas) || coordenadas.length < 2) return null;
    return {
      puntos: coordenadas.map(([lng, lat]) => [redondear(lng), redondear(lat)]),
      metros: Number(ruta.properties?.summary?.distance) || 0,
      segundos: Number(ruta.properties?.summary?.duration) || 0,
    };
  } finally {
    clearTimeout(reloj);
  }
};

const rutas = new Map(); // pedidoId → { hacia, puntos, metros, segundos, cuando, intento }
const desdeLaTienda = new Map(); // pedidoId → { desde, hacia, ruta, intento, visto }

const olvidarViejas = (ahora) => {
  for (const [id, r] of rutas) if (ahora - r.intento > OLVIDO_MS) rutas.delete(id);
  for (const [id, r] of desdeLaTienda) if (ahora - r.visto > OLVIDO_MS) desdeLaTienda.delete(id);
};

export const olvidarRuta = (pedidoId) => {
  rutas.delete(String(pedidoId));
  desdeLaTienda.delete(String(pedidoId));
};

// Lo que se le manda al cliente: la línea que falta, los metros y el tiempo.
const respuesta = (base, recorte) => ({
  puntos: recorte.puntos,
  metros: Math.round(recorte.metrosRestantes),
  segundos: base.metros > 0 ? Math.round(base.segundos * Math.min(1, recorte.metrosRestantes / base.metros)) : null,
});

// La ruta que le falta al repartidor de este pedido, o null si no hay (sin llave, sin destino, o
// el servicio no encontró camino). Nunca lanza: si algo falla, el mapa se queda con los dos puntos
// de siempre.
export const rutaDelRepartidor = async ({ pedidoId, desde, hacia, llave, pedir = pedirRutaORS, ahora = Date.now() }) => {
  if (!llave || !valido(desde) || !valido(hacia)) return null;
  const id = String(pedidoId);
  olvidarViejas(ahora);

  let guardada = rutas.get(id);
  // Si cambió la casa (se corrigió la dirección), la ruta guardada ya no sirve.
  if (guardada && distanciaMetros(guardada.hacia, hacia) > 5) {
    rutas.delete(id);
    guardada = null;
  }

  const recorte = guardada ? recortarRuta(guardada.puntos, desde) : null;
  const vigente = recorte && recorte.desvioM <= DESVIO_MAXIMO_M && ahora - guardada.cuando < VIGENCIA_MS;
  const puedePedir = !guardada || ahora - guardada.intento >= ESPERA_ENTRE_CONSULTAS_MS;

  if (!vigente && puedePedir) {
    try {
      const nueva = await pedir({ desde, hacia, llave });
      if (nueva) {
        rutas.set(id, { hacia, ...nueva, cuando: ahora, intento: ahora });
        const deLaNueva = recortarRuta(nueva.puntos, desde);
        return deLaNueva ? respuesta(nueva, deLaNueva) : null;
      }
    } catch (error) {
      console.log("No se pudo calcular la ruta del repartidor:", error.message);
    }
    // Falló o no hubo camino: se anota el intento para no insistir enseguida.
    if (guardada) guardada.intento = ahora;
    else rutas.set(id, { hacia, puntos: [], metros: 0, segundos: 0, cuando: 0, intento: ahora });
  }

  return recorte ? respuesta(guardada, recorte) : null;
};

// ── MIENTRAS NO LLEGA EL GPS DEL REPARTIDOR ── El pedido ya salió, pero el teléfono del
// repartidor no ha mandado su punto: lo pusieron en camino desde el panel web (que no comparte
// ubicación), el GPS no agarra señal adentro de la casa, o la app se cerró en la calle.
const VELOCIDAD_SIN_RUTA_MS = 18000 / 3600; // 18 km/h
const RODEO_DE_CALLES = 1.35;

export const estimadoDesdeLaTienda = async ({ pedidoId, tienda, hacia, salio, llave, pedir = pedirRutaORS, ahora = Date.now() }) => {
  if (!valido(tienda) || !valido(hacia)) return null;
  const desde = { lat: Number(tienda.lat), lng: Number(tienda.lng) };
  const id = String(pedidoId);
  olvidarViejas(ahora);

  let guardada = desdeLaTienda.get(id);
  // Se corrigió la dirección o se movió la tienda: la ruta guardada ya no sirve.
  if (guardada && (distanciaMetros(guardada.hacia, hacia) > 5 || distanciaMetros(guardada.desde, desde) > 5)) {
    desdeLaTienda.delete(id);
    guardada = null;
  }
  if (llave && !guardada?.ruta && (!guardada || ahora - guardada.intento >= ESPERA_ENTRE_CONSULTAS_MS)) {
    let ruta = null;
    try {
      ruta = await pedir({ desde, hacia, llave });
    } catch (error) {
      console.log("No se pudo calcular la ruta desde la tienda:", error.message);
    }
    guardada = { desde, hacia, ruta, intento: ahora };
  }
  if (guardada) desdeLaTienda.set(id, { ...guardada, visto: ahora });

  const ruta = guardada?.ruta || null;
  const metros = ruta?.metros || Math.round(distanciaMetros(desde, hacia) * RODEO_DE_CALLES);
  const total = ruta?.segundos || metros / VELOCIDAD_SIN_RUTA_MS;
  const salida = salio ? new Date(salio).getTime() : NaN;
  const pasaron = Number.isFinite(salida) ? Math.max(0, (ahora - salida) / 1000) : 0;

  return {
    desde,
    // Arranca en el pin de la tienda, igual que la del repartidor arranca en él.
    puntos: ruta ? [[redondear(desde.lng), redondear(desde.lat)], ...ruta.puntos] : null,
    metros: Math.round(metros),
    segundos: Math.max(0, Math.round(total - pasaron)),
  };
};
