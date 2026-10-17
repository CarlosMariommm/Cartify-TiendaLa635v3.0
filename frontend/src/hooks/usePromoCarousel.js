import { useState, useEffect, useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { promotionService } from '../api/promotionService';
import { promosVisibles, promoEnModulo } from '../utils/promos';

// usePromoCarousel — el cerebro del carrusel 3D de promociones. Trae las promos que se anuncian,
// lleva cuál está al centro, avanza sola y calcula la posición de cada tarjeta en el anillo. La
// vista solo pinta. El giro es circular: desde la última se sigue a la primera sin saltos.
const INTERVALO = 5000; // cada cuánto avanza sola

// Cuántas promos entran al carrusel. Ahora se ven tres de frente, así que caben más en la rotación
// sin que la primera tarde una eternidad en volver: con nueve, el anillo da la vuelta en tres
// pasos.
const MAXIMO = 9;

// ¿Caben las tres promos de frente? En pantalla ancha se muestran las tres completas, una al lado
// de otra: son pocas y todas valen, así que esconder dos detrás de un giro era regalar espacio. En
// un teléfono no caben tres tarjetas legibles, así que ahí se vuelve al anillo con una al centro.
const ANCHO_PARA_TRES = 1000;

const suscribirAncho = (avisar) => {
  window.addEventListener('resize', avisar);
  return () => window.removeEventListener('resize', avisar);
};

export const useCabenTres = () =>
  useSyncExternalStore(
    suscribirAncho,
    () => window.innerWidth >= ANCHO_PARA_TRES,
    () => false
  );

export const usePromoCarousel = ({ autoplay = true, moduloId = null } = {}) => {
  // Todas las anunciables; el filtro por pasillo se aplica después.
  const [todas, setTodas] = useState([]);
  // Mientras llegan, el carrusel guarda su lugar (ver PromoBanners). Sin esto no pintaba nada y, al
  // llegar, aparecía de golpe empujando toda la tienda hacia abajo: el producto que alguien iba a
  // tocar se le corría del dedo.
  const [cargando, setCargando] = useState(true);
  const [activa, setActiva] = useState(0);
  const [pausada, setPausada] = useState(false);
  const temporizador = useRef(null);

  useEffect(() => {
    let vivo = true;
    promotionService.getPromotions()
      // Las más nuevas primero: si la tienda arma una promo hoy, quiere que
      // se vea, no que quede detrás de una de hace tres meses.
      .then((d) => {
        if (!vivo) return;
        const visibles = promosVisibles(d)
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .slice(0, MAXIMO);
        setTodas(visibles);
      })
      .catch(() => {})
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, []);

  // Filtro por pasillo: en la Panadería salen solo las promos de panadería. Sin pasillo elegido
  // (toda la tienda) se ven todas. Ver promoEnModulo.
  const promos = useMemo(
    () => todas.filter((p) => promoEnModulo(p, moduloId)),
    [todas, moduloId]
  );

  // Al cambiar de pasillo se vuelve al principio del carrusel, para no quedar
  // apuntando a una tarjeta que en el pasillo nuevo ya no está.
  const [moduloVisto, setModuloVisto] = useState(moduloId);
  if (moduloVisto !== moduloId) {
    setModuloVisto(moduloId);
    setActiva(0);
  }

  const total = promos.length;

  const irA = useCallback((i) => {
    if (total === 0) return;
    // Módulo que también funciona con negativos.
    setActiva(((i % total) + total) % total);
  }, [total]);

  const siguiente = useCallback(() => irA(activa + 1), [irA, activa]);
  const anterior = useCallback(() => irA(activa - 1), [irA, activa]);

  // Avance automático. Se detiene con el mouse encima o si solo hay una promo.
  useEffect(() => {
    clearInterval(temporizador.current);
    if (!autoplay || pausada || total < 2) return undefined;
    temporizador.current = setInterval(() => {
      setActiva((i) => (i + 1) % total);
    }, INTERVALO);
    return () => clearInterval(temporizador.current);
  }, [autoplay, pausada, total]);

  // Si se borra una promo, el índice guardado puede quedar fuera de rango. Se corrige AL LEERLO en
  // vez de con un efecto que llame a setState: así no hay un render intermedio apuntando a una
  // tarjeta que ya no existe.
  const activaSegura = total > 0 ? Math.min(activa, total - 1) : 0;

  // Distancia de una tarjeta respecto al centro, por el camino más corto. Con 5 promos y la 0
  // activa, la 4 está a -1 (no a +4): así el anillo gira para el lado que menos se mueve y nunca
  // pega un salto raro.
  const distancia = useCallback((i) => {
    if (total === 0) return 0;
    let d = i - activaSegura;
    if (d > total / 2) d -= total;
    if (d < -total / 2) d += total;
    return d;
  }, [activaSegura, total]);

  return {
    promos,
    cargando,
    activa: activaSegura,
    total,
    irA,
    siguiente,
    anterior,
    distancia,
    pausar: () => setPausada(true),
    reanudar: () => setPausada(false),
  };
};
