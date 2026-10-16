import { useEffect, useMemo, useRef, useState } from 'react';
import { Vibration } from 'react-native';
import { getCourierPosition } from '../api/pedidosApi';
import { useAviso } from '../context/AvisoContext';
import { distanciaMetros, minutosDeViaje, textoDeEspera, formatoDistancia } from '../utils/geo';
import { tAhora } from '../utils/idioma';

/*
 * ============================================================
 * SEGUIMIENTO EN VIVO — useSeguimientoEnVivo.js
 * ============================================================
 * Copia de `frontend/src/hooks/useSeguimientoEnVivo.js`: preguntar cada
 * pocos segundos dónde va el repartidor y traducirlo a algo que se entienda
 * ("llega en 10 min aprox."). Mismo por qué preguntar y no un socket: el
 * backend es Express pelado, y una consulta cada 10 segundos a una ruta que
 * devuelve cuatro números sale más barato que sumar un servidor de sockets.
 *
 * Dos diferencias con la web, las dos porque el navegador y el teléfono no
 * tienen las mismas herramientas:
 *   - El aviso de "ya casi llega" usa useAviso (ver AvisoContext) en vez de
 *     react-hot-toast.
 *   - El tirón en el bolsillo usa `Vibration` de react-native en vez de
 *     `navigator.vibrate`.
 * ============================================================
 */

const CADA_CUANTO_MS = 10000;      // se pregunta cada 10 segundos
const SENAL_FRIA_MS = 90000;       // sin noticias en minuto y medio: se avisa
const YA_CASI_M = 250;             // dos cuadras: el punto de levantarse

/*
 * `conAviso`: si este seguimiento da el aviso de "ya casi toca tu puerta". Lo
 * da la burbuja; el detalle del pedido sigue el mismo pedido sin avisar, para
 * que no salga dos veces.
 */
export const useSeguimientoEnVivo = (pedidoId, activo = true, { conAviso = true } = {}) => {
  const { avisar } = useAviso();
  const [datos, setDatos] = useState(null);
  const [ahora, setAhora] = useState(() => Date.now());

  const anteriorRef = useRef(null);
  const avisadoRef = useRef(false);

  useEffect(() => {
    if (!pedidoId || !activo) return;

    let vivo = true;
    let reloj = null;
    anteriorRef.current = null;
    avisadoRef.current = false;

    const preguntar = async () => {
      try {
        const data = await getCourierPosition(pedidoId);
        if (!vivo) return;

        // Pedido cerrado, se deja de preguntar.
        if (['entregado', 'cancelado'].includes(data?.status)) {
          clearInterval(reloj);
        }

        const courier = data?.courier?.lat != null ? data.courier : null;

        let velocidad = anteriorRef.current?.velocidad || null;
        const previo = anteriorRef.current;
        if (courier && previo?.updatedAt && previo.updatedAt !== courier.updatedAt) {
          const segundos = (new Date(courier.updatedAt) - new Date(previo.updatedAt)) / 1000;
          const metros = distanciaMetros(previo, courier);
          if (segundos > 0 && metros != null) velocidad = metros / segundos;
        }
        if (courier) anteriorRef.current = { ...courier, velocidad };

        // "Ya casi toca tu puerta" — una sola vez por pedido.
        if (conAviso && courier && data?.destino && !avisadoRef.current) {
          const faltan = distanciaMetros(courier, data.destino);
          if (faltan != null && faltan <= YA_CASI_M) {
            avisadoRef.current = true;
            avisar(tAhora('Tu pedido ya casi toca tu puerta'), 'reparto');
            Vibration.vibrate([120, 60, 120]);
          }
        }

        setDatos({
          id: pedidoId,
          status: data?.status || null,
          destino: data?.destino || null,
          courier,
          velocidad,
          // La ruta por las calles que le falta (backend/src/utils/rutaReparto.js), o null.
          ruta: data?.ruta?.puntos?.length > 1 ? data.ruta : null,
          // Sin punto fresco del repartidor: la ruta desde la tienda y cuánto
          // falta desde que salió (estimadoDesdeLaTienda, mismo archivo), o null.
          estimado: data?.estimado?.desde ? data.estimado : null,
        });
      } catch {
        // Un fallo de red no borra lo que ya se sabía.
      }
    };

    preguntar();
    reloj = setInterval(preguntar, CADA_CUANTO_MS);
    return () => { vivo = false; clearInterval(reloj); };
  }, [pedidoId, activo, avisar, conAviso]);

  // Un tic aparte para que "hace 2 min" envejezca solo.
  useEffect(() => {
    if (!activo) return;
    const reloj = setInterval(() => setAhora(Date.now()), 15000);
    return () => clearInterval(reloj);
  }, [activo]);

  const actual = activo && datos?.id === pedidoId ? datos : null;
  const courier = actual?.courier || null;

  const punto = courier?.lat != null && courier?.lng != null
    ? { lat: courier.lat, lng: courier.lng }
    : null;

  const desdeUltimoDato = courier?.updatedAt
    ? ahora - new Date(courier.updatedAt).getTime()
    : null;

  const senalFria = desdeUltimoDato != null && desdeUltimoDato > SENAL_FRIA_MS;
  const enVivo = !!punto && !senalFria;
  // Sin eso, lo aproximado desde la tienda (si el servidor lo mandó).
  const estimado = enVivo ? null : actual?.estimado || null;

  /*
   * Con la ruta por las calles, lo que falta es lo que mide esa línea y la
   * espera sale de su tiempo; sin ella, la línea recta de siempre. Con la
   * señal fría no se muestra: sería un camino desde donde ya no está.
   */
  const ruta = enVivo ? actual?.ruta : null;
  const puntosDeLinea = ruta?.puntos || estimado?.puntos || null;
  // La misma línea llega como objeto nuevo en cada consulta: se compara por
  // contenido para no recrear el WebView del mapa cada 10 segundos.
  const claveDeLinea = puntosDeLinea?.length > 1 ? JSON.stringify(puntosDeLinea) : '';
  const lineaDeRuta = useMemo(
    () => (claveDeLinea ? JSON.parse(claveDeLinea).map(([lng, lat]) => ({ lat, lng })) : null),
    [claveDeLinea]
  );

  const metrosFaltantes = !enVivo ? null : ruta?.metros
    ?? (actual?.destino ? distanciaMetros(punto, actual.destino) : null);
  const minutos = estimado
    ? Math.max(1, Math.round(estimado.segundos / 60))
    : ruta?.segundos != null
      ? Math.max(1, Math.round(ruta.segundos / 60))
      : minutosDeViaje(metrosFaltantes, actual?.velocidad);

  return {
    enVivo,
    // Sin GPS del repartidor: ruta y tiempo aproximados desde la tienda
    // (`origen`). Las pantallas lo dicen así y no pintan su punto.
    estimado: !!estimado,
    origen: estimado?.desde || null,
    estado: actual?.status || null,
    // Un punto con la señal fría no se dibuja como si fuera de ahorita.
    punto: enVivo ? punto : null,
    destino: actual?.destino || null,
    // La línea por las calles que le falta (o la de la tienda), como [{lat,lng}…], o null.
    ruta: lineaDeRuta,
    repartidor: courier?.name || '',
    senalFria,
    minutosDesdeUltimoDato: desdeUltimoDato != null ? Math.floor(desdeUltimoDato / 60000) : null,
    distancia: formatoDistancia(metrosFaltantes),
    espera: textoDeEspera(minutos),
    minutos,
    yaCasi: enVivo && metrosFaltantes != null && metrosFaltantes <= YA_CASI_M,
  };
};

export default useSeguimientoEnVivo;
