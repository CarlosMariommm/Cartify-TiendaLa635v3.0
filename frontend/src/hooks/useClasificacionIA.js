import { useState, useEffect, useRef, useMemo } from 'react';
import { clasificacionService } from '../api/clasificacionService';
import { clasificarPorReglas, esFamiliaValida } from '../utils/familias';
import { useAuth } from './useAuth';

// useClasificacionIA — el PASO 2 del clasificador: lo que las reglas no pudieron. El 90% del
// catálogo de una tienda de barrio lo resuelve familias.js con puras reglas: instantáneo, gratis y
// sin internet.

const LLAVE_CACHE = 'kartify:familias-ia';
const MAXIMO_POR_LOTE = 60; // lo que cabe en una petición sin volverla lenta

// La memoria vive fuera del hook (a nivel de módulo) para que sobreviva a los cambios de pantalla:
// el cliente entra a un producto, vuelve a la tienda y el hook se monta de nuevo, pero lo ya
// preguntado sigue sabido.
const memoria = new Map();
const yaPreguntados = new Set();

// Lo aprendido se guarda en el navegador. Si el localStorage está lleno o
// bloqueado (modo privado), no pasa nada: se sigue sin memoria entre visitas.
const leerCache = () => {
  try {
    const crudo = localStorage.getItem(LLAVE_CACHE);
    if (!crudo) return;
    Object.entries(JSON.parse(crudo) || {}).forEach(([idProducto, familia]) => {
      if (esFamiliaValida(familia)) memoria.set(idProducto, familia);
    });
  } catch {
    // Cache corrupta o inaccesible: se empieza de cero y ya.
  }
};

const guardarCache = () => {
  try {
    localStorage.setItem(LLAVE_CACHE, JSON.stringify(Object.fromEntries(memoria)));
  } catch {
    // Sin espacio para guardar: la clasificación de esta visita igual funciona.
  }
};

leerCache();

export const useClasificacionIA = (productos) => {
  // QUIÉN puede preguntarle a la IA. Ver el guard del efecto, más abajo.
  const { haySesionDePersonal } = useAuth();

  const [familias, setFamilias] = useState(() => Object.fromEntries(memoria));
  const [clasificando, setClasificando] = useState(false);
  // `vuelta` es lo que dispara el siguiente lote. Con catálogos de más de 60 productos sin
  // clasificar hace falta ir por tandas, y cambiar este número hace que el efecto se vuelva a mirar
  // los pendientes.
  const [vuelta, setVuelta] = useState(0);
  // Si la petición falla una vez, no se insiste. Reintentar en bucle contra un
  // servidor caído solo llena la consola y calienta el teléfono.
  const rendido = useRef(false);

  // Los que nadie supo clasificar: ni vienen con familia guardada, ni las reglas los resolvieron, ni
  // se preguntaron ya en esta sesión.
  const pendientes = useMemo(() => {
    // Ojo: aquí NO se mira `rendido`. Leer un ref mientras se pinta está
    // prohibido en React (y el linter lo caza). El "ya me rendí" se revisa
    // abajo, en el efecto, que es donde de verdad importa.
    return (productos || []).filter((p) => {
      const idProducto = p?.id || p?._id;
      if (!idProducto || yaPreguntados.has(idProducto)) return false;
      if (esFamiliaValida(p.familia)) return false;
      if (memoria.has(idProducto)) return false;
      return !clasificarPorReglas(p);
    });
    // `vuelta` entra en las dependencias a propósito: es la señal de "ya
    // terminó un lote, mirá si quedó algo".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos, vuelta]);

  useEffect(() => {
    // SOLO PREGUNTA EL PERSONAL. Este es el guard más importante del archivo. POST /ai/clasificar es
    // soloPersonal en el backend —gasta cuota de Gemini, y abierta cualquiera se la quema con un
    // bucle—.
    if (!haySesionDePersonal) return;

    if (!pendientes.length || rendido.current) return;

    const lote = pendientes.slice(0, MAXIMO_POR_LOTE);
    // Se marcan ANTES de pedir: entre que sale la petición y vuelve, el
    // componente se pinta varias veces y sin esta guarda se pediría lo mismo
    // dos y tres veces.
    lote.forEach((p) => yaPreguntados.add(p.id || p._id));

    let vivo = true;
    const preguntar = async () => {
      setClasificando(true);
      // Solo el id y el nombre: el precio y el stock no ayudan a saber si algo
      // es un energizante, y de paso viaja menos información del cliente.
      const datos = await clasificacionService.clasificarProductos(
        lote.map((p) => ({ id: p.id || p._id, nombre: p.nombre || p.name || '' }))
      );

      const respuesta = Array.isArray(datos?.familias) ? datos.familias : [];
      // Que no venga nada es normal (la IA no está configurada o no supo). Que
      // haya fallado la red es otra cosa: ahí no vale la pena seguir
      // preguntando por los demás lotes.
      if (datos?.origen === 'sin-red') rendido.current = true;

      // Lo aprendido se apunta aunque el hook ya se haya desmontado (el cliente se cambió de pasillo
      // mientras cargaba): la memoria vive fuera de React y tirar una respuesta que ya se pagó sería
      // desperdiciarla. Lo que sí se salta es tocar el estado de un componente que ya no existe.
      let hubo = false;
      respuesta.forEach(({ id: idProducto, familia }) => {
        if (!idProducto || !esFamiliaValida(familia)) return;
        memoria.set(String(idProducto), familia);
        hubo = true;
      });
      if (hubo) guardarCache();

      if (!vivo) return;
      if (hubo) setFamilias(Object.fromEntries(memoria));
      setClasificando(false);
      // Siguiente tanda (si quedó alguna). Si no quedó, el efecto no hace nada.
      if (!rendido.current) setVuelta((v) => v + 1);
    };

    preguntar();
    return () => { vivo = false; };
  }, [pendientes, haySesionDePersonal]);

  return { familias, clasificando };
};
