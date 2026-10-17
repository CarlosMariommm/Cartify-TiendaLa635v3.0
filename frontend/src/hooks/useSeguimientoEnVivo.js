import { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { ICONOS } from '../utils/iconosAviso';
import { orderService } from '../api/orderService';
import { distanciaMetros, minutosDeViaje, textoDeEspera, formatoDistancia } from '../utils/geo';
import { useIdioma } from './useIdioma';
import { tAhora } from '../utils/idioma';

// SEGUIMIENTO EN VIVO — useSeguimientoEnVivo.js
// El lado del cliente: preguntar cada pocos segundos dónde va el repartidor y traducirlo a algo
// que se entienda ("llega en 10 min aprox.").

const CADA_CUANTO_MS = 10000;      // se pregunta cada 10 segundos
const SENAL_FRIA_MS = 90000;       // sin noticias en minuto y medio: se avisa

// A esta distancia se avisa que ya casi tocan la puerta. 250 metros son como dos cuadras: el punto
// justo donde vale la pena levantarse.
const YA_CASI_M = 250;

export const useSeguimientoEnVivo = (pedidoId, activo = true) => {
  // Todo en un solo estado y con el id adentro. Así, cuando se cambia de pedido, lo que quedó del
  // anterior se descarta al comparar en vez de tener que limpiarlo a mano y provocar un render de
  // más.
  const [datos, setDatos] = useState(null);
  const [ahora, setAhora] = useState(() => Date.now());

  // El punto anterior, para medir a qué velocidad viene de verdad. Solo se toca dentro de la
  // consulta (nunca al pintar), que es justo para lo que sirve un ref.
  const anteriorRef = useRef(null);

  // Para no repetir el aviso de "ya casi llega" en cada vuelta del reloj.
  const avisadoRef = useRef(false);
  const { t } = useIdioma();

  useEffect(() => {
    if (!pedidoId || !activo) return;

    let vivo = true;
    let reloj = null;
    anteriorRef.current = null;
    avisadoRef.current = false;

    const preguntar = async () => {
      try {
        const data = await orderService.getCourierPosition(pedidoId);
        if (!vivo) return;

        // Pedido cerrado, se deja de preguntar. Sin esto, la pestaña de alguien que dejó la tienda abierta
        // seguiría consultando cada diez segundos toda la tarde por un pedido que ya recibió.
        if (["entregado", "cancelado"].includes(data?.status)) {
          clearInterval(reloj);
        }

        const courier = data?.courier?.lat != null ? data.courier : null;

        // Velocidad medida: metros entre el punto anterior y este, divididos por los segundos que pasaron.
        // Solo cuenta si el punto es nuevo de verdad — repetir la misma posición daría velocidad cero y
        // una espera infinita que no le sirve a nadie.
        let velocidad = anteriorRef.current?.velocidad || null;
        const previo = anteriorRef.current;
        if (courier && previo?.updatedAt && previo.updatedAt !== courier.updatedAt) {
          const segundos = (new Date(courier.updatedAt) - new Date(previo.updatedAt)) / 1000;
          const metros = distanciaMetros(previo, courier);
          if (segundos > 0 && metros != null) velocidad = metros / segundos;
        }
        if (courier) anteriorRef.current = { ...courier, velocidad };

        // ── "Ya casi toca tu puerta" ── El aviso que de verdad importa. Mirar un puntito acercarse es
        // entretenido, pero lo que la gente quiere es que le digan CUÁNDO levantarse: nadie se queda con
        // el teléfono en la mano midiendo cuadras.
        if (courier && data?.destino && !avisadoRef.current) {
          const faltan = distanciaMetros(courier, data.destino);
          if (faltan != null && faltan <= YA_CASI_M) {
            avisadoRef.current = true;
            toast(tAhora('Tu pedido ya casi toca tu puerta'), {
              id: `ya-casi-${pedidoId}`,
              duration: 8000,
              icon: ICONOS.reparto,
            });
            // Un tirón en el bolsillo, para quien no tenga la tienda a la vista.
            navigator.vibrate?.([120, 60, 120]);
          }
        }

        setDatos({
          id: pedidoId,
          // De paso viene el estado del pedido. Es gratis y arregla algo que
          // no funcionaba: la burbuja se quedaba en "Recibido" hasta que el
          // cliente recargara, aunque en la tienda ya lo estuvieran armando.
          status: data?.status || null,
          destino: data?.destino || null,
          courier,
          velocidad,
          // La ruta por las calles que le falta al repartidor (el servidor la calcula y la va recortando;
          // ver backend/src/utils/rutaReparto.js). Null sin servicio de rutas: el mapa queda con sus dos
          // puntos.
          ruta: data?.ruta?.puntos?.length > 1 ? data.ruta : null,
          // Sin punto fresco del repartidor, el servidor manda la ruta desde la tienda y cuánto falta desde
          // que salió (estimadoDesdeLaTienda, en el mismo archivo). Null si la tienda no guardó su
          // ubicación.
          estimado: data?.estimado?.desde ? data.estimado : null,
        });
      } catch {
        // Un fallo de red no borra lo que ya se sabía: se deja el último punto y el reloj de abajo se
        // encarga de enfriar la señal si esto se repite. Parpadear el mapa en cada bache de señal se ve
        // peor.
      }
    };

    preguntar();
    reloj = setInterval(preguntar, CADA_CUANTO_MS);
    return () => { vivo = false; clearInterval(reloj); };
  }, [pedidoId, activo]);

  // Un tic aparte para que "hace 2 min" envejezca solo, sin esperar a que
  // llegue una posición nueva (que justamente puede que no llegue).
  useEffect(() => {
    if (!activo) return;
    const reloj = setInterval(() => setAhora(Date.now()), 15000);
    return () => clearInterval(reloj);
  }, [activo]);

  // ── Las cuentas ────────────────────────────────────────────
  // Lo del pedido anterior no cuenta: si el id no coincide, es basura vieja.
  const actual = activo && datos?.id === pedidoId ? datos : null;
  const courier = actual?.courier || null;

  const punto = courier?.lat != null && courier?.lng != null
    ? { lat: courier.lat, lng: courier.lng }
    : null;

  const desdeUltimoDato = courier?.updatedAt
    ? ahora - new Date(courier.updatedAt).getTime()
    : null;

  const senalFria = desdeUltimoDato != null && desdeUltimoDato > SENAL_FRIA_MS;
  // Solo se considera "en vivo" si hay punto Y la señal está fresca.
  const enVivo = !!punto && !senalFria;
  // Sin eso, lo aproximado desde la tienda (si el servidor lo mandó).
  const estimado = enVivo ? null : actual?.estimado || null;

  // Con la ruta por las calles, lo que falta es lo que mide ESA línea y la espera sale de su tiempo;
  // sin ella, la línea recta de siempre con la velocidad medida. Una ruta con la señal fría no se
  // muestra: sería dibujar el camino desde un punto donde el repartidor ya no está.
  const ruta = enVivo ? actual?.ruta : null;
  const puntosDeLinea = ruta?.puntos || estimado?.puntos || null;
  // La misma línea llega como objeto nuevo en cada consulta: se compara por
  // contenido para no volver a dibujarla cada 10 segundos si no cambió.
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
    // Sin GPS del repartidor: la ruta y el tiempo son aproximados, desde la tienda (`origen`). Las
    // pantallas lo dicen así y no pintan su punto.
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
    espera: textoDeEspera(minutos, t),
    minutos,
    // Últimas dos cuadras: la UI lo usa para ponerse en modo "levántese ya".
    yaCasi: enVivo && metrosFaltantes != null && metrosFaltantes <= YA_CASI_M,
  };
};
