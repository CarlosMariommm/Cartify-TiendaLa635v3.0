// EL REPARTO EN EL TELÉFONO — useRepartoPersonal.js
// El único Reparto que queda (el de la web se quitó: repartir es cosa del teléfono), en la app del
// personal: - Los pedidos a domicilio que faltan por entregar.

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { personalApi } from '../api/personalApi';
import { usePersonal } from '../context/PersonalContext';
import { borrar, guardar, leer, llave } from '../utils/almacen';

const CADA_CUANTO_MS = 10000;
const MOVIMIENTO_MINIMO_M = 15;
// Quieto, igual manda su punto cada 30 s: el cliente lo da por viejo a los 90 s.
const LATIDO_MS = 30000;
const LLAVE_VIAJE = llave('cartify', 'viaje-reparto');
const TAG_PANTALLA = 'reparto';
const ESTADOS_DEL_REPARTO = ['pagado', 'preparando', 'en_camino'];

// Distancia en metros entre dos puntos (Haversine), igual que utils/geo.js de la web.
const distanciaMetros = (a, b) => {
  const R = 6371000;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

export const useRepartoPersonal = () => {
  const { sesion, salir } = usePersonal();
  const token = sesion?.token;
  const quien = sesion?.nombre || '';

  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [moviendo, setMoviendo] = useState(null);

  const [enViaje, setEnViaje] = useState([]);
  const [posicion, setPosicion] = useState(null);
  const [errorGps, setErrorGps] = useState('');

  const enViajeRef = useRef([]);
  const vigiaRef = useRef(null);
  const latidoRef = useRef(null);
  const ultimoEnvioRef = useRef({ t: 0, punto: null });
  const posicionRef = useRef(null);

  // ── Los pedidos ──

  const cargar = useCallback(async () => {
    if (!token) return;
    try {
      setError('');
      const todos = await personalApi.pedidos(token);
      setPedidos((Array.isArray(todos) ? todos : []).filter(
        (o) => o.deliveryType === 'delivery' && ESTADOS_DEL_REPARTO.includes(o.status)
      ));
    } catch (e) {
      if (e?.estado === 401) { salir(); return; }
      setError(e?.message || 'No se pudieron cargar los pedidos.');
    } finally {
      setCargando(false);
    }
  }, [token, salir]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── La ubicación ──

  const enviar = useCallback(async (punto, forzado = false) => {
    const ids = enViajeRef.current;
    if (!ids.length || !token) return;
    const ahora = Date.now();
    const { t, punto: anterior } = ultimoEnvioRef.current;
    if (!forzado) {
      if (ahora - t < CADA_CUANTO_MS) return;
      if (anterior && distanciaMetros(anterior, punto) < MOVIMIENTO_MINIMO_M) return;
    }
    ultimoEnvioRef.current = { t: ahora, punto };
    // Un pedido que falla (se canceló mientras iba) no frena a los demás.
    await Promise.allSettled(ids.map((id) => personalApi.ubicacion(token, id, { lat: punto.lat, lng: punto.lng, quien })));
  }, [token, quien]);

  const encenderGps = useCallback(async () => {
    if (vigiaRef.current) return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorGps('No nos dio permiso de usar su ubicación. Actívelo en los ajustes del teléfono para compartir el viaje.');
        return;
      }
      setErrorGps('');
      vigiaRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        ({ coords }) => {
          const punto = { lat: coords.latitude, lng: coords.longitude };
          posicionRef.current = punto;
          setPosicion(punto);
          enviar(punto);
        }
      );
      // El GPS solo avisa al moverse: el latido reenvía el último punto.
      clearInterval(latidoRef.current);
      latidoRef.current = setInterval(() => {
        const punto = posicionRef.current;
        if (punto && Date.now() - ultimoEnvioRef.current.t >= LATIDO_MS) enviar(punto, true);
      }, LATIDO_MS / 3);
      // La primera señal precisa puede tardar más de un minuto adentro de la tienda, y mientras tanto el
      // cliente no ve al repartidor. La última ubicación que el teléfono ya conoce (de hace poco y no
      // muy gruesa) sale al instante; el GPS fino la corrige en cuanto agarra señal.
      if (!posicionRef.current) {
        const conocida = await Location.getLastKnownPositionAsync({ maxAge: 2 * 60 * 1000, requiredAccuracy: 150 })
          .catch(() => null);
        if (conocida && !posicionRef.current) {
          const punto = { lat: conocida.coords.latitude, lng: conocida.coords.longitude };
          posicionRef.current = punto;
          setPosicion(punto);
          enviar(punto, true);
        }
      }
    } catch {
      setErrorGps('No se pudo leer su ubicación. Revise que el GPS esté encendido.');
    }
  }, [enviar]);

  const apagarGps = useCallback(() => {
    vigiaRef.current?.remove?.();
    vigiaRef.current = null;
    clearInterval(latidoRef.current);
    latidoRef.current = null;
    ultimoEnvioRef.current = { t: 0, punto: null };
    posicionRef.current = null;
    setPosicion(null);
  }, []);

  const guardarViaje = (ids) => {
    enViajeRef.current = ids;
    setEnViaje(ids);
    if (ids.length) guardar(LLAVE_VIAJE, JSON.stringify(ids));
    else borrar(LLAVE_VIAJE);
  };

  // Empieza (o retoma) a compartir la ubicación para este pedido.
  const empezarViaje = useCallback(async (pedidoId) => {
    const id = String(pedidoId);
    if (!enViajeRef.current.includes(id)) guardarViaje([...enViajeRef.current, id]);
    activateKeepAwakeAsync(TAG_PANTALLA).catch(() => {});
    await encenderGps();
    if (posicionRef.current) enviar(posicionRef.current, true);
  }, [encenderGps, enviar]);

  // Deja de compartir para este pedido; si era el último, se apaga el GPS.
  const quitarDelViaje = useCallback(async (pedidoId) => {
    const id = String(pedidoId);
    guardarViaje(enViajeRef.current.filter((x) => x !== id));
    // El punto se borra en el servidor, no se deja quieto en el mapa del cliente.
    personalApi.ubicacion(token, id, { activo: false }).catch(() => {});
    if (!enViajeRef.current.length) {
      apagarGps();
      deactivateKeepAwake(TAG_PANTALLA).catch(() => {});
    }
  }, [token, apagarGps]);

  const vaEnViaje = useCallback((pedidoId) => enViaje.includes(String(pedidoId)), [enViaje]);

  // Un viaje a medias (la app se cerró en la calle) se retoma al volver.
  useEffect(() => {
    let vivo = true;
    leer(LLAVE_VIAJE).then((crudo) => {
      if (!vivo || !crudo) return;
      try {
        const ids = JSON.parse(crudo);
        if (Array.isArray(ids) && ids.length) {
          guardarViaje(ids.map(String));
          activateKeepAwakeAsync(TAG_PANTALLA).catch(() => {});
          encenderGps();
        }
      } catch {
        borrar(LLAVE_VIAJE);
      }
    });
    return () => { vivo = false; };
  }, [encenderGps]);

  // Al salir del modo personal: nada sigue leyendo el GPS ni con la pantalla prendida.
  useEffect(() => () => {
    vigiaRef.current?.remove?.();
    clearInterval(latidoRef.current);
    deactivateKeepAwake(TAG_PANTALLA).catch(() => {});
  }, []);

  // ── Mover los pedidos ──

  const avanzar = useCallback(async (pedido, estado, extras = {}) => {
    setMoviendo(pedido._id);
    try {
      await personalApi.avanzar(token, pedido._id, estado, quien, extras);
      await cargar();
    } finally {
      setMoviendo(null);
    }
  }, [token, quien, cargar]);

  // "Salí a repartir": marca en camino Y empieza a compartir la ubicación, en un solo toque (igual
  // que la web). Dos botones separados se hacían a medias y el cliente se quedaba viendo
  // "Preparando" toda la entrega.
  const salirEnCamino = useCallback(async (pedido) => {
    await avanzar(pedido, 'en_camino');
    if (pedido.deliveryLat != null && pedido.deliveryLng != null) empezarViaje(pedido._id);
  }, [avanzar, empezarViaje]);

  // Entregar cierra el viaje de ese pedido: nadie tiene que acordarse de apagarlo.
  const entregar = useCallback(async (pedido, extras) => {
    await avanzar(pedido, 'entregado', extras);
    if (enViajeRef.current.includes(String(pedido._id))) quitarDelViaje(pedido._id);
  }, [avanzar, quitarDelViaje]);

  return {
    pedidos, cargando, error, moviendo, recargar: cargar,
    avanzar, salirEnCamino, entregar,
    enViaje, posicion, errorGps, vaEnViaje, empezarViaje, quitarDelViaje,
  };
};

export default useRepartoPersonal;
